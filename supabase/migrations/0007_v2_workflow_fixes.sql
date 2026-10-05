-- ============================================================
-- 0007 — Second Serving V2 workflow fixes
--   1. Realtime publication for the tables the UI subscribes to
--   2. cancel_donation(): also reject pending claims + cancel open tasks
--   3. Org owners can no longer be removed by org admins
--   4. accept_pickup_task(): donor / claimant cannot deliver their own food
--   5. Inactive accounts cannot create claims
--   6. deactivate_account(): cancels the user's live donations, claims, tasks
-- ============================================================

-- ------------------------------------------------------------
-- 1. Realtime
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['donations', 'donation_claims', 'pickup_tasks', 'notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;      -- already in the publication
      when undefined_object then            -- publication missing (plain Postgres)
        raise notice 'supabase_realtime publication not found; skipping %', t;
    end;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 2. cancel_donation() with full cleanup
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

  select * into v_accepted_claim from donation_claims
  where donation_id = p_donation_id and status = 'accepted';

  if v_donation.donor_id != auth.uid()
     and coalesce(v_accepted_claim.claimant_id != auth.uid(), true) then
    raise exception 'not authorized';
  end if;

  update donations
  set status = 'cancelled', cancellation_reason = p_reason
  where id = p_donation_id;

  -- notify everyone with a stake (except the person cancelling) BEFORE rejecting
  insert into notifications (recipient_id, type, title, body, related_donation_id)
  select distinct c.claimant_id, 'donation_cancelled', 'Donation cancelled',
         '"' || v_donation.title || '" was cancelled: ' || p_reason, p_donation_id
  from donation_claims c
  where c.donation_id = p_donation_id
    and c.status in ('pending', 'accepted')
    and c.claimant_id != auth.uid();

  if v_donation.donor_id != auth.uid() then
    insert into notifications (recipient_id, type, title, body, related_donation_id)
    values (v_donation.donor_id, 'donation_cancelled', 'Donation cancelled',
            '"' || v_donation.title || '" was cancelled: ' || p_reason, p_donation_id);
  end if;

  -- volunteer on an assigned task is told too
  insert into notifications (recipient_id, type, title, body, related_donation_id)
  select t.volunteer_id, 'donation_cancelled', 'Delivery cancelled',
         'The delivery for "' || v_donation.title || '" was cancelled.', p_donation_id
  from pickup_tasks t
  where t.donation_id = p_donation_id
    and t.volunteer_id is not null
    and t.status not in ('delivered', 'cancelled')
    and t.volunteer_id != auth.uid();

  update donation_claims
  set status = case when status = 'accepted' then 'cancelled'::claim_status
                    else 'rejected'::claim_status end,
      responded_at = coalesce(responded_at, now())
  where donation_id = p_donation_id and status in ('pending', 'accepted');

  update pickup_tasks
  set status = 'cancelled'
  where donation_id = p_donation_id and status not in ('delivered', 'cancelled');
end;
$$;
revoke execute on function cancel_donation(uuid, text) from public;
grant execute on function cancel_donation(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 3. Org owner cannot be removed by an org admin
-- ------------------------------------------------------------
drop policy if exists "org_members_delete" on organization_members;
create policy "org_members_delete"
  on organization_members for delete
  to authenticated
  using (
    -- anyone may leave, except the owner (ownership must be handed over / org removed)
    (profile_id = auth.uid() and org_role != 'owner')
    -- admins/owners may remove non-owner members
    or (org_role != 'owner' and is_org_admin(organization_id, auth.uid()))
  );

-- ------------------------------------------------------------
-- 4. No self-dealing on delivery tasks
-- ------------------------------------------------------------
create or replace function accept_pickup_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task pickup_tasks%rowtype;
  v_donor uuid;
  v_claimant uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_task from pickup_tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'task not found';
  end if;
  if v_task.status != 'open' or v_task.volunteer_id is not null then
    raise exception 'this task is no longer available';
  end if;

  select d.donor_id, c.claimant_id into v_donor, v_claimant
  from donations d
  join donation_claims c on c.id = v_task.claim_id
  where d.id = v_task.donation_id;

  if auth.uid() in (v_donor, v_claimant) then
    raise exception 'you cannot deliver your own donation or request';
  end if;

  update pickup_tasks
  set status = 'assigned', volunteer_id = auth.uid()
  where id = p_task_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id)
  select p.id, 'task_assigned', 'A volunteer accepted the delivery',
         'A volunteer is on the way to arrange delivery.', v_task.donation_id
  from (values (v_donor), (v_claimant)) as p(id);
end;
$$;
revoke execute on function accept_pickup_task(uuid) from public;
grant execute on function accept_pickup_task(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. Inactive accounts cannot create claims
-- ------------------------------------------------------------
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
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'your account is deactivated';
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

  if p_organization_id is not null and not is_org_member(p_organization_id, auth.uid()) then
    raise exception 'you are not a member of that organization';
  end if;

  insert into donation_claims (donation_id, claimant_id, organization_id, fulfillment_method, message)
  values (p_donation_id, auth.uid(), p_organization_id, p_fulfillment_method, p_message)
  returning id into v_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_donation.donor_id, 'claim_received', 'New request on your donation',
    'Someone has requested "' || v_donation.title || '".', p_donation_id, v_claim_id
  );

  return v_claim_id;
end;
$$;
revoke execute on function create_claim(uuid, fulfillment_method, uuid, text) from public;
grant execute on function create_claim(uuid, fulfillment_method, uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 6. deactivate_account(): clean up live activity
-- ------------------------------------------------------------
create or replace function deactivate_account(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if auth.uid() != p_target_profile_id and not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  -- cancel the user's live donations (handles claims + tasks via the same rules)
  for v_id in
    select id from donations
    where donor_id = p_target_profile_id
      and status in ('draft', 'available', 'claimed', 'pickup_assigned', 'picked_up', 'delivered')
  loop
    update donations set status = 'cancelled', cancellation_reason = 'Donor account deactivated'
    where id = v_id;
    update donation_claims
    set status = case when status = 'accepted' then 'cancelled'::claim_status
                      else 'rejected'::claim_status end,
        responded_at = coalesce(responded_at, now())
    where donation_id = v_id and status in ('pending', 'accepted');
    update pickup_tasks set status = 'cancelled'
    where donation_id = v_id and status not in ('delivered', 'cancelled');
  end loop;

  -- withdraw the user's own pending/accepted requests
  update donation_claims set status = 'cancelled'
  where claimant_id = p_target_profile_id and status in ('pending', 'accepted');

  -- release tasks the user volunteered for back to the pool
  update pickup_tasks
  set status = 'open', volunteer_id = null
  where volunteer_id = p_target_profile_id and status in ('assigned', 'en_route_pickup');

  update profiles
  set is_active = false, full_name = 'Deleted User', avatar_url = null
  where id = p_target_profile_id;

  update profile_private set phone = null where profile_id = p_target_profile_id;
  delete from organization_members where profile_id = p_target_profile_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'user.deactivated', 'profiles', p_target_profile_id, null);
end;
$$;
revoke execute on function deactivate_account(uuid) from public;
grant execute on function deactivate_account(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. Browse never lists food whose pickup window has passed
-- ------------------------------------------------------------
create or replace function nearby_donations(user_lat double precision, user_lng double precision, radius_m integer)
returns setof donations
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select d.*
  from donations d
  where d.status = 'available'
    and d.pickup_window_end > now()
    and earth_box(ll_to_earth(user_lat, user_lng), radius_m) @> ll_to_earth(d.latitude, d.longitude)
    and earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) <= radius_m
  order by earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) asc;
$$;
revoke execute on function nearby_donations(double precision, double precision, integer) from public;
grant execute on function nearby_donations(double precision, double precision, integer) to authenticated;
