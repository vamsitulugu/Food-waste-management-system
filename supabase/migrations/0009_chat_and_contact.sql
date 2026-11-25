-- ============================================================
-- 0009 — In-app chat + call between donor, recipient and volunteer
--   1. claim_messages        : one chat thread per accepted claim
--   2. claim_chat_reads      : per-user "last read" marker (unread badges)
--   3. RLS                   : only the people on that pickup can read
--   4. RPCs                  : send_chat_message, mark_chat_read,
--                              my_chat_threads, chat_participants
--   5. Realtime              : live messages
--   6. handle_new_user()     : saves the phone entered at signup
--
-- Safe to run more than once. Paste into Supabase → SQL Editor → Run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------
create table if not exists claim_messages (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references donation_claims(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists idx_claim_messages_claim on claim_messages(claim_id, created_at);

create table if not exists claim_chat_reads (
  claim_id uuid not null references donation_claims(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (claim_id, profile_id)
);

-- ------------------------------------------------------------
-- 2. Who may chat? donor, accepted recipient, assigned volunteer —
--    only once the donor has accepted the request.
-- ------------------------------------------------------------
create or replace function is_chat_participant(p_claim_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from donation_claims c
    join donations d on d.id = c.donation_id
    left join pickup_tasks t on t.claim_id = c.id
    where c.id = p_claim_id
      and c.status in ('accepted', 'completed')
      and p_uid is not null
      and p_uid in (d.donor_id, c.claimant_id, t.volunteer_id)
  );
$$;
revoke execute on function is_chat_participant(uuid, uuid) from public;
grant execute on function is_chat_participant(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. RLS — read-only from the client; writes go through RPCs
-- ------------------------------------------------------------
alter table claim_messages enable row level security;
alter table claim_chat_reads enable row level security;

drop policy if exists "claim_messages_select_participants" on claim_messages;
create policy "claim_messages_select_participants"
  on claim_messages for select
  to authenticated
  using (is_chat_participant(claim_id, auth.uid()));

drop policy if exists "claim_chat_reads_select_self" on claim_chat_reads;
create policy "claim_chat_reads_select_self"
  on claim_chat_reads for select
  to authenticated
  using (profile_id = auth.uid());

-- ------------------------------------------------------------
-- 4a. send_chat_message()
-- ------------------------------------------------------------
create or replace function send_chat_message(p_claim_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_msg_id uuid;
  v_donation_id uuid;
  v_title text;
  v_sender_name text;
  v_recipient uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if char_length(v_body) = 0 then
    raise exception 'message cannot be empty';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'message is too long (max 1000 characters)';
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'account is not active';
  end if;
  if not is_chat_participant(p_claim_id, auth.uid()) then
    raise exception 'chat is only available once the request is accepted';
  end if;

  insert into claim_messages (claim_id, sender_id, body)
  values (p_claim_id, auth.uid(), v_body)
  returning id into v_msg_id;

  -- the sender has obviously read up to now
  insert into claim_chat_reads (claim_id, profile_id, last_read_at)
  values (p_claim_id, auth.uid(), now())
  on conflict (claim_id, profile_id) do update set last_read_at = excluded.last_read_at;

  select c.donation_id, d.title into v_donation_id, v_title
  from donation_claims c join donations d on d.id = c.donation_id
  where c.id = p_claim_id;

  select full_name into v_sender_name from profiles where id = auth.uid();

  -- notify everyone else on the pickup, but don't spam: only if they don't
  -- already have an unread chat notification for this claim
  for v_recipient in
    select distinct u from (
      select d.donor_id as u from donations d where d.id = v_donation_id
      union all select c.claimant_id from donation_claims c where c.id = p_claim_id
      union all select t.volunteer_id from pickup_tasks t where t.claim_id = p_claim_id
    ) x
    where u is not null and u <> auth.uid()
  loop
    if not exists (
      select 1 from notifications n
      where n.recipient_id = v_recipient
        and n.type = 'chat_message'
        and n.related_claim_id = p_claim_id
        and n.is_read = false
    ) then
      insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
      values (
        v_recipient, 'chat_message',
        'New message from ' || coalesce(v_sender_name, 'someone'),
        left(v_body, 120) || ' — about "' || v_title || '"',
        v_donation_id, p_claim_id
      );
    end if;
  end loop;

  return v_msg_id;
end;
$$;
revoke execute on function send_chat_message(uuid, text) from public;
grant execute on function send_chat_message(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 4b. mark_chat_read()
-- ------------------------------------------------------------
create or replace function mark_chat_read(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_chat_participant(p_claim_id, auth.uid()) then
    return;
  end if;

  insert into claim_chat_reads (claim_id, profile_id, last_read_at)
  values (p_claim_id, auth.uid(), now())
  on conflict (claim_id, profile_id) do update set last_read_at = now();

  -- clear the matching bell notification as well
  update notifications
     set is_read = true
   where recipient_id = auth.uid()
     and related_claim_id = p_claim_id
     and type = 'chat_message'
     and is_read = false;
end;
$$;
revoke execute on function mark_chat_read(uuid) from public;
grant execute on function mark_chat_read(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4c. chat_participants() — names + roles of the people on a pickup
-- ------------------------------------------------------------
create or replace function chat_participants(p_claim_id uuid)
returns table (profile_id uuid, full_name text, party text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_chat_participant(p_claim_id, auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select d.donor_id, p.full_name, 'donor'::text
    from donation_claims c
    join donations d on d.id = c.donation_id
    join profiles p on p.id = d.donor_id
    where c.id = p_claim_id
    union all
    select c.claimant_id, p.full_name, 'recipient'::text
    from donation_claims c
    join profiles p on p.id = c.claimant_id
    where c.id = p_claim_id
    union all
    select t.volunteer_id, p.full_name, 'volunteer'::text
    from pickup_tasks t
    join profiles p on p.id = t.volunteer_id
    where t.claim_id = p_claim_id and t.volunteer_id is not null;
end;
$$;
revoke execute on function chat_participants(uuid) from public;
grant execute on function chat_participants(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4d. my_chat_threads() — inbox: one row per conversation I'm part of
-- ------------------------------------------------------------
create or replace function my_chat_threads()
returns table (
  claim_id uuid,
  donation_id uuid,
  donation_title text,
  other_names text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    d.id,
    d.title,
    (
      select string_agg(p.full_name, ', ' order by p.full_name)
      from profiles p
      where p.id <> auth.uid()
        and p.id in (d.donor_id, c.claimant_id, t.volunteer_id)
    ),
    lm.body,
    coalesce(lm.created_at, c.responded_at, c.updated_at),
    lm.sender_id,
    coalesce((
      select count(*)::int
      from claim_messages m
      where m.claim_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select r.last_read_at from claim_chat_reads r
           where r.claim_id = c.id and r.profile_id = auth.uid()),
          '-infinity'::timestamptz)
    ), 0)
  from donation_claims c
  join donations d on d.id = c.donation_id
  left join pickup_tasks t on t.claim_id = c.id
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from claim_messages m
    where m.claim_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.status in ('accepted', 'completed')
    and auth.uid() in (d.donor_id, c.claimant_id, t.volunteer_id)
  order by 6 desc nulls last;
$$;
revoke execute on function my_chat_threads() from public;
grant execute on function my_chat_threads() to authenticated;

-- ------------------------------------------------------------
-- 5. Realtime
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table claim_messages;
  exception
    when duplicate_object then null;
    when undefined_object then
      raise notice 'supabase_realtime publication not found; skipping claim_messages';
  end;
end;
$$;

-- ------------------------------------------------------------
-- 6. Phone at signup — handle_new_user() now reads "phone" from the
--    signup metadata and stores it in the private table.
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), null);

  insert into profile_private (profile_id, phone)
  values (new.id, left(v_phone, 20));

  return new;
end;
$$;
