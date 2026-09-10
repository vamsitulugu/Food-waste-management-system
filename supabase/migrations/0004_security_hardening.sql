-- ============================================================
-- Security hardening pass (post-audit)
-- Food Waste Management System
-- ============================================================
--
-- FINDING: several SECURITY DEFINER functions used the pattern
--   if some_column != auth.uid() then raise exception 'not authorized'; end if;
-- In PL/pgSQL, `IF <expr> THEN ... END IF` treats a NULL expression the
-- same as FALSE — it silently skips the THEN branch. When auth.uid() is
-- NULL (an anonymous / unauthenticated caller), `column != NULL` evaluates
-- to NULL, not TRUE, so the RAISE EXCEPTION is skipped and the function
-- proceeds as if the check had passed.
--
-- Combined with several of these functions also being missing the
-- `revoke execute ... from public` lockdown (so they were callable by the
-- `anon` role by Postgres's default grant-to-PUBLIC behavior), this meant
-- an unauthenticated caller who knew or guessed a donation/claim/task id
-- could call these RPCs and bypass their ownership checks entirely.
--
-- FIX: every affected function gets an explicit
--   if auth.uid() is null then raise exception 'authentication required'; end if;
-- as its first statement (belt-and-suspenders — correct regardless of
-- grants), AND every function now has an explicit
--   revoke execute ... from public; grant execute ... to authenticated;
-- (the actual access-control layer, per the architecture's own stated
-- requirement in §8, which this migration brings every function into
-- compliance with).
-- ============================================================

-- ------------------------------------------------------------
-- publish_donation()
-- ------------------------------------------------------------
create or replace function publish_donation(p_donation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_donor_id uuid;
  v_status donation_status;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select donor_id, status into v_donor_id, v_status from donations where id = p_donation_id;

  if v_donor_id is null then
    raise exception 'donation not found';
  end if;
  if v_donor_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_status != 'draft' then
    raise exception 'only a draft donation can be published';
  end if;

  update donations set status = 'available' where id = p_donation_id;
end;
$$;
revoke execute on function publish_donation(uuid) from public;
grant execute on function publish_donation(uuid) to authenticated;

-- ------------------------------------------------------------
-- create_claim() — also extended to accept an optional organization_id,
-- so an NGO/food-bank member can attribute a claim to their organization
-- (the column already existed on donation_claims but nothing ever set it).
-- The parameter list is changing, so the old 3-argument overload is
-- dropped explicitly rather than left dangling alongside a new one.
-- ------------------------------------------------------------
drop function if exists create_claim(uuid, fulfillment_method, text);

create or replace function create_claim(
  p_donation_id uuid,
  p_fulfillment_method fulfillment_method,
  p_organization_id uuid default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_donation donations%rowtype;
  v_claim_id uuid;
  v_is_org_member boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_donation from donations where id = p_donation_id for update;

  if v_donation.id is null then
    raise exception 'donation not found';
  end if;
  if v_donation.donor_id = auth.uid() then
    raise exception 'you cannot claim your own donation';
  end if;
  if v_donation.status != 'available' then
    raise exception 'this donation is no longer available';
  end if;
  if now() >= v_donation.pickup_window_end then
    raise exception 'the pickup window for this donation has passed';
  end if;

  if p_organization_id is not null then
    select exists (
      select 1 from organization_members
      where organization_id = p_organization_id and profile_id = auth.uid()
    ) into v_is_org_member;
    if not v_is_org_member then
      raise exception 'you are not a member of that organization';
    end if;
  end if;

  insert into donation_claims (donation_id, claimant_id, organization_id, fulfillment_method, message)
  values (p_donation_id, auth.uid(), p_organization_id, p_fulfillment_method, p_message)
  returning id into v_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_donation.donor_id, 'claim_received', 'New claim on your donation',
    'Someone has requested "' || v_donation.title || '".', p_donation_id, v_claim_id
  );

  return v_claim_id;
end;
$$;
revoke execute on function create_claim(uuid, fulfillment_method, uuid, text) from public;
grant execute on function create_claim(uuid, fulfillment_method, uuid, text) to authenticated;

-- ------------------------------------------------------------
-- accept_claim()
-- ------------------------------------------------------------
create or replace function accept_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
  v_donation donations%rowtype;
  v_task_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_claim from donation_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'claim not found';
  end if;

  select * into v_donation from donations where id = v_claim.donation_id for update;
  if v_donation.donor_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_claim.status != 'pending' then
    raise exception 'this claim is no longer pending';
  end if;
  if v_donation.status != 'available' then
    raise exception 'this donation is no longer available to claim';
  end if;

  update donation_claims set status = 'accepted', responded_at = now()
  where id = p_claim_id;

  update donation_claims set status = 'rejected', responded_at = now()
  where donation_id = v_claim.donation_id and status = 'pending' and id != p_claim_id;

  if v_claim.fulfillment_method = 'volunteer_assisted' then
    insert into pickup_tasks (donation_id, claim_id)
    values (v_claim.donation_id, p_claim_id)
    returning id into v_task_id;

    update donations set status = 'pickup_assigned' where id = v_claim.donation_id;
  else
    update donations set status = 'claimed' where id = v_claim.donation_id;
  end if;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_claim.claimant_id, 'claim_accepted', 'Your claim was accepted',
    '"' || v_donation.title || '" is now reserved for you.', v_donation.id, p_claim_id
  );
end;
$$;
revoke execute on function accept_claim(uuid) from public;
grant execute on function accept_claim(uuid) to authenticated;

-- ------------------------------------------------------------
-- reject_claim()
-- ------------------------------------------------------------
create or replace function reject_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
  v_donor_id uuid;
  v_title text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_claim from donation_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'claim not found';
  end if;

  select donor_id, title into v_donor_id, v_title from donations where id = v_claim.donation_id;
  if v_donor_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_claim.status != 'pending' then
    raise exception 'this claim is no longer pending';
  end if;

  update donation_claims set status = 'rejected', responded_at = now() where id = p_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_claim.claimant_id, 'claim_rejected', 'Your claim was declined',
    'The donor declined your request for "' || v_title || '".', v_claim.donation_id, p_claim_id
  );
end;
$$;
revoke execute on function reject_claim(uuid) from public;
grant execute on function reject_claim(uuid) to authenticated;

-- ------------------------------------------------------------
-- cancel_claim()
-- ------------------------------------------------------------
create or replace function cancel_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_claim from donation_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'claim not found';
  end if;
  if v_claim.claimant_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_claim.status != 'pending' then
    raise exception 'only a pending claim can be cancelled';
  end if;

  update donation_claims set status = 'cancelled', responded_at = now() where id = p_claim_id;
end;
$$;
revoke execute on function cancel_claim(uuid) from public;
grant execute on function cancel_claim(uuid) to authenticated;

-- ------------------------------------------------------------
-- confirm_self_pickup()
-- ------------------------------------------------------------
create or replace function confirm_self_pickup(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
  v_donation donations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_claim from donation_claims where id = p_claim_id for update;
  if v_claim.id is null or v_claim.claimant_id != auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_claim.fulfillment_method != 'self_pickup' then
    raise exception 'this claim is not a self-pickup claim';
  end if;

  select * into v_donation from donations where id = v_claim.donation_id for update;
  if v_donation.status != 'claimed' then
    raise exception 'this donation is not awaiting pickup confirmation';
  end if;

  update donations set status = 'completed' where id = v_donation.id;
  update donation_claims set status = 'completed' where id = p_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_donation.donor_id, 'donation_completed', 'Donation completed',
    '"' || v_donation.title || '" was picked up and marked complete.', v_donation.id, p_claim_id
  );
end;
$$;
revoke execute on function confirm_self_pickup(uuid) from public;
grant execute on function confirm_self_pickup(uuid) to authenticated;

-- ------------------------------------------------------------
-- confirm_delivery()
-- ------------------------------------------------------------
create or replace function confirm_delivery(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
  v_donation donations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_claim from donation_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'claim not found';
  end if;
  if v_claim.fulfillment_method != 'volunteer_assisted' then
    raise exception 'this claim is not a volunteer-assisted claim';
  end if;

  select * into v_donation from donations where id = v_claim.donation_id for update;
  if auth.uid() != v_donation.donor_id and auth.uid() != v_claim.claimant_id then
    raise exception 'not authorized';
  end if;
  if v_donation.status != 'delivered' then
    raise exception 'this donation has not been marked delivered yet';
  end if;

  update donations set status = 'completed' where id = v_donation.id;
  update donation_claims set status = 'completed' where id = p_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  select p.id, 'donation_completed', 'Donation completed',
         '"' || v_donation.title || '" was delivered and marked complete.', v_donation.id, p_claim_id
  from (values (v_donation.donor_id), (v_claim.claimant_id)) as p(id)
  where p.id != auth.uid();
end;
$$;
revoke execute on function confirm_delivery(uuid) from public;
grant execute on function confirm_delivery(uuid) to authenticated;

-- ------------------------------------------------------------
-- cancel_donation()
-- ------------------------------------------------------------
create or replace function cancel_donation(p_donation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_donation donations%rowtype;
  v_accepted_claim donation_claims%rowtype;
  v_is_donor boolean;
  v_is_claimant boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'a cancellation reason is required';
  end if;

  select * into v_donation from donations where id = p_donation_id for update;
  if v_donation.id is null then
    raise exception 'donation not found';
  end if;
  if v_donation.status in ('completed', 'cancelled', 'expired', 'rejected') then
    raise exception 'this donation can no longer be cancelled';
  end if;

  v_is_donor := (v_donation.donor_id = auth.uid());

  select * into v_accepted_claim from donation_claims
  where donation_id = p_donation_id and status = 'accepted';
  v_is_claimant := (v_accepted_claim.claimant_id = auth.uid());

  if not coalesce(v_is_donor, false) and not coalesce(v_is_claimant, false) then
    raise exception 'not authorized';
  end if;

  update donations set status = 'cancelled', cancellation_reason = p_reason where id = p_donation_id;

  if v_accepted_claim.id is not null then
    update donation_claims set status = 'cancelled' where id = v_accepted_claim.id;

    insert into notifications (recipient_id, type, title, body, related_donation_id)
    select p.id, 'donation_cancelled', 'Donation cancelled',
           '"' || v_donation.title || '" was cancelled: ' || p_reason, p_donation_id
    from (values (v_donation.donor_id), (v_accepted_claim.claimant_id)) as p(id)
    where p.id != auth.uid();
  end if;
end;
$$;
revoke execute on function cancel_donation(uuid, text) from public;
grant execute on function cancel_donation(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- accept_pickup_task()
-- ------------------------------------------------------------
create or replace function accept_pickup_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role user_role;
  v_updated_rows int;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select role into v_role from profiles where id = auth.uid();
  if v_role is distinct from 'volunteer' then
    raise exception 'only volunteers can accept pickup tasks';
  end if;

  update pickup_tasks
  set status = 'assigned', volunteer_id = auth.uid()
  where id = p_task_id and status = 'open' and volunteer_id is null;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'this task is no longer available';
  end if;
end;
$$;
revoke execute on function accept_pickup_task(uuid) from public;
grant execute on function accept_pickup_task(uuid) to authenticated;

-- ------------------------------------------------------------
-- update_task_status()
-- ------------------------------------------------------------
create or replace function update_task_status(p_task_id uuid, p_new_status pickup_task_status)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task pickup_tasks%rowtype;
  v_donation donations%rowtype;
  v_claim donation_claims%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_task from pickup_tasks where id = p_task_id for update;
  if v_task.id is null or v_task.volunteer_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  if not (
    (v_task.status = 'assigned' and p_new_status = 'en_route_pickup')
    or (v_task.status = 'en_route_pickup' and p_new_status = 'picked_up')
    or (v_task.status = 'picked_up' and p_new_status = 'en_route_delivery')
    or (v_task.status = 'en_route_delivery' and p_new_status = 'delivered')
  ) then
    raise exception 'invalid task status transition';
  end if;

  update pickup_tasks
  set status = p_new_status,
      pickup_confirmed_at = case when p_new_status = 'picked_up' then now() else pickup_confirmed_at end,
      delivered_confirmed_at = case when p_new_status = 'delivered' then now() else delivered_confirmed_at end
  where id = p_task_id;

  select * into v_donation from donations where id = v_task.donation_id for update;
  select * into v_claim from donation_claims where id = v_task.claim_id;

  if p_new_status = 'picked_up' then
    update donations set status = 'picked_up' where id = v_donation.id;
  elsif p_new_status = 'delivered' then
    update donations set status = 'delivered' where id = v_donation.id;
    insert into notifications (recipient_id, type, title, body, related_donation_id)
    select p.id, 'task_delivered', 'Delivery completed',
           '"' || v_donation.title || '" has been delivered. Please confirm receipt.', v_donation.id
    from (values (v_donation.donor_id), (v_claim.claimant_id)) as p(id);
  end if;
end;
$$;
revoke execute on function update_task_status(uuid, pickup_task_status) from public;
grant execute on function update_task_status(uuid, pickup_task_status) to authenticated;

-- ------------------------------------------------------------
-- update_member_role() — already had revoke/grant; adding the null
-- guard for defense-in-depth consistency with every other function.
-- ------------------------------------------------------------
create or replace function update_member_role(p_org_id uuid, p_target_profile_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_role text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select org_role into v_caller_role
  from organization_members
  where organization_id = p_org_id and profile_id = auth.uid();

  if v_caller_role is distinct from 'owner' then
    raise exception 'only the organization owner can change member roles';
  end if;
  if p_new_role not in ('member', 'admin') then
    raise exception 'invalid role';
  end if;

  update organization_members
  set org_role = p_new_role
  where organization_id = p_org_id and profile_id = p_target_profile_id;
end;
$$;
revoke execute on function update_member_role(uuid, uuid, text) from public;
grant execute on function update_member_role(uuid, uuid, text) to authenticated;

-- ------------------------------------------------------------
-- provision_admin() — internal logic was already safe (is_admin() is
-- EXISTS-based and never returns NULL), but it was missing the
-- revoke/grant lockdown entirely. Adding both for consistency and
-- defense-in-depth.
-- ------------------------------------------------------------
create or replace function provision_admin(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  update profiles set role = 'admin', updated_at = now()
  where id = target_profile_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'user.promoted_to_admin', 'profiles', target_profile_id, null);
end;
$$;
revoke execute on function provision_admin(uuid) from public;
grant execute on function provision_admin(uuid) to authenticated;

-- ============================================================
-- Avatars storage bucket — same pattern as donation-images, but
-- lower sensitivity (profile pictures), so read access is simply
-- "any authenticated user" to match profiles' own SELECT policy.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_storage_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_storage_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_storage_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
