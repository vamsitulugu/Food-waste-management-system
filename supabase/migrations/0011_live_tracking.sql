-- ============================================================
-- 0011 — Live tracking between recipient and donor
--   1. live_locations          : ONE row per (claim, person) = latest position
--                                only. No location history is ever stored.
--   2. RLS                     : only people on that pickup can read
--                                (reuses is_chat_participant from 0009)
--   3. RPCs                    : update_live_location (upsert, recipient or
--                                assigned volunteer only), stop_live_location
--   4. 100 m alert             : update_live_location() notifies the donor
--                                ("recipient_nearby") once per claim
--   5. Auto-delete             : rows vanish when the claim or donation ends
--   6. Stale-row sweep         : rows nobody refreshed for 30 min are removed
--   7. Realtime                : live position updates
--
-- Safe to run more than once. Paste into Supabase → SQL Editor → Run.
-- Requires 0009 (is_chat_participant) to have been run already.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------
create table if not exists live_locations (
  claim_id   uuid not null references donation_claims(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  accuracy   double precision check (accuracy is null or accuracy >= 0),   -- metres
  heading    double precision check (heading is null or (heading >= 0 and heading <= 360)),
  updated_at timestamptz not null default now(),
  primary key (claim_id, profile_id)
);
create index if not exists idx_live_locations_updated_at on live_locations(updated_at);

-- ------------------------------------------------------------
-- 2. RLS — read-only from the client; writes go through RPCs
-- ------------------------------------------------------------
alter table live_locations enable row level security;

drop policy if exists "live_locations_select_participants" on live_locations;
create policy "live_locations_select_participants"
  on live_locations for select
  to authenticated
  using (is_chat_participant(claim_id, auth.uid()));

-- No insert / update / delete policies exist, so direct writes are denied.
-- Revoke the table privileges as well, as a second lock.
revoke all on live_locations from public, anon, authenticated;
grant select on live_locations to authenticated;

-- one "recipient_nearby" notification per claim, ever
create unique index if not exists uq_recipient_nearby_per_claim
  on notifications (related_claim_id)
  where type = 'recipient_nearby';

-- ------------------------------------------------------------
-- 3a. Helper: straight-line (haversine) distance in metres
-- ------------------------------------------------------------
create or replace function live_distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
set search_path = public, pg_temp
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- ------------------------------------------------------------
-- 3b. update_live_location() — upsert my latest position
--     Only the recipient (claimant) or the volunteer assigned to this
--     claim may call it, and only while the pickup is in progress.
--     Also raises the one-off "recipient is nearby" alert for the donor.
-- ------------------------------------------------------------
create or replace function update_live_location(
  p_claim_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision default null,
  p_heading double precision default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_claimant uuid;
  v_claim_status claim_status;
  v_donation_id uuid;
  v_donor uuid;
  v_donation_status donation_status;
  v_title text;
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_volunteer uuid;
  v_accuracy double precision;
  v_heading double precision;
  v_dist double precision;
  v_name text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  -- NaN compares greater than every number in Postgres, so this rejects NaN too.
  if p_lat is null or p_lng is null
     or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    raise exception 'invalid coordinates';
  end if;
  if not exists (select 1 from profiles where id = v_uid and is_active) then
    raise exception 'account is not active';
  end if;

  select c.claimant_id, c.status, c.donation_id,
         d.donor_id, d.status, d.title, d.latitude, d.longitude
    into v_claimant, v_claim_status, v_donation_id,
         v_donor, v_donation_status, v_title, v_pickup_lat, v_pickup_lng
  from donation_claims c
  join donations d on d.id = c.donation_id
  where c.id = p_claim_id;

  if not found then
    raise exception 'claim not found';
  end if;

  select t.volunteer_id into v_volunteer
  from pickup_tasks t
  where t.claim_id = p_claim_id
  order by t.created_at desc
  limit 1;

  if v_uid <> v_claimant and v_uid is distinct from v_volunteer then
    raise exception 'only the recipient or the assigned volunteer can share a live location';
  end if;

  if v_claim_status <> 'accepted'
     or v_donation_status not in ('claimed', 'pickup_assigned') then
    raise exception 'live tracking is only available while the pickup is in progress';
  end if;

  -- sanitise the optional GPS fields rather than rejecting the whole update
  v_accuracy := case
    when p_accuracy is null or p_accuracy = 'NaN'::double precision or p_accuracy < 0 then null
    else least(p_accuracy, 100000)
  end;
  v_heading := case
    when p_heading is null or p_heading = 'NaN'::double precision
         or p_heading < 0 or p_heading > 360 then null
    else p_heading
  end;

  -- latest position only: overwrite, never append
  insert into live_locations (claim_id, profile_id, latitude, longitude, accuracy, heading, updated_at)
  values (p_claim_id, v_uid, p_lat, p_lng, v_accuracy, v_heading, now())
  on conflict (claim_id, profile_id) do update
    set latitude   = excluded.latitude,
        longitude  = excluded.longitude,
        accuracy   = excluded.accuracy,
        heading    = excluded.heading,
        updated_at = excluded.updated_at;

  -- 100 m alert: recipient only, once per claim (unique index below makes
  -- "once" race-proof). A very imprecise fix cannot trigger it, so GPS jitter
  -- indoors does not raise a false alarm.
  if v_uid = v_claimant then
    v_dist := live_distance_m(p_lat, p_lng, v_pickup_lat, v_pickup_lng);
    if v_dist <= 100 and coalesce(v_accuracy, 0) <= 60 then
      select full_name into v_name from profiles where id = v_uid;

      insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
      values (
        v_donor, 'recipient_nearby',
        'The recipient is nearby',
        coalesce(v_name, 'The recipient') || ' is within 100 m of the pickup for "' || v_title || '".',
        v_donation_id, p_claim_id
      )
      on conflict (related_claim_id) where type = 'recipient_nearby' do nothing;
    end if;
  end if;
end;
$$;
revoke execute on function update_live_location(uuid, double precision, double precision, double precision, double precision) from public;
grant execute on function update_live_location(uuid, double precision, double precision, double precision, double precision) to authenticated;

-- ------------------------------------------------------------
-- 3c. stop_live_location() — remove MY position for this claim
--     (only ever touches the caller's own row)
-- ------------------------------------------------------------
create or replace function stop_live_location(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  delete from live_locations
  where claim_id = p_claim_id
    and profile_id = auth.uid();
end;
$$;
revoke execute on function stop_live_location(uuid) from public;
grant execute on function stop_live_location(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Auto-delete when the pickup ends. Triggers (not app code) so it
--    holds no matter which RPC, cron job or admin action changed the status.
--      claim:    leaves 'accepted'  -> completed / cancelled / rejected
--      donation: leaves 'claimed' / 'pickup_assigned' -> picked_up,
--                delivered, completed, cancelled, expired, rejected, ...
--    Rows are also removed by "on delete cascade" if the claim is deleted.
-- ------------------------------------------------------------
create or replace function purge_live_locations_for_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status and new.status <> 'accepted' then
    delete from live_locations where claim_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function purge_live_locations_for_claim() from public, anon, authenticated;

drop trigger if exists trg_purge_live_locations_claim on donation_claims;
create trigger trg_purge_live_locations_claim
  after update of status on donation_claims
  for each row execute function purge_live_locations_for_claim();

create or replace function purge_live_locations_for_donation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and new.status not in ('claimed', 'pickup_assigned') then
    delete from live_locations
    where claim_id in (select c.id from donation_claims c where c.donation_id = new.id);
  end if;
  return new;
end;
$$;
revoke execute on function purge_live_locations_for_donation() from public, anon, authenticated;

drop trigger if exists trg_purge_live_locations_donation on donations;
create trigger trg_purge_live_locations_donation
  after update of status on donations
  for each row execute function purge_live_locations_for_donation();

-- ------------------------------------------------------------
-- 5. Stale-row sweep: if someone closes the tab without tapping "Stop",
--    their last position must not linger. Removes rows not refreshed for
--    30 minutes. Scheduled every 5 minutes when pg_cron is available
--    (same approach as 0010); the app also treats a row older than ~45 s
--    as "signal lost", so a stale row is never shown as current.
-- ------------------------------------------------------------
create or replace function sweep_stale_live_locations(p_max_age interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from live_locations where updated_at < now() - p_max_age;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke execute on function sweep_stale_live_locations(interval) from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  begin
    perform cron.unschedule('sweep-stale-live-locations');
  exception when others then null; -- job did not exist yet
  end;
  perform cron.schedule('sweep-stale-live-locations', '*/5 * * * *', 'select public.sweep_stale_live_locations();');
exception
  when others then
    raise notice 'Could not schedule the stale-location sweep with pg_cron (%). Enable pg_cron under Database > Extensions and re-run this file. Live tracking still works without it.', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- 6. Realtime
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table live_locations;
  exception
    when duplicate_object then null;
    when undefined_object then
      raise notice 'supabase_realtime publication not found; skipping live_locations';
  end;
end;
$$;
