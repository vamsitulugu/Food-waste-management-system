-- ============================================================
-- 0006 — Fix "infinite recursion detected in policy" + remove account types
--
-- WHY THE ERROR HAPPENED
--   Postgres refuses to expand an RLS policy that (directly or indirectly)
--   queries its own table:
--     donations_select       -> donation_claims / pickup_tasks
--     claims_select          -> donations              (cycle!)
--     tasks_select           -> donations              (cycle!)
--     org_members_select     -> organization_members   (self reference!)
--     donations_update...    -> donations d2           (self reference!)
--     organizations_update.. -> organizations o2       (self reference!)
--
-- THE FIX
--   Small SECURITY DEFINER helper functions read the other table with RLS
--   bypassed (same pattern the project already uses for is_admin()), so the
--   policies no longer point at each other. Access rules are unchanged.
--
-- REMOVING ACCOUNT TYPES
--   Every signed-in user can now donate, request food and deliver.
--   The only remaining special role is 'admin'.
--
-- Run this whole file once in Supabase -> SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (bypass RLS on purpose; read-only, stable)
-- ------------------------------------------------------------
create or replace function is_donation_donor(p_donation_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from donations where id = p_donation_id and donor_id = uid); $$;

create or replace function is_donation_claimant(p_donation_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from donation_claims where donation_id = p_donation_id and claimant_id = uid); $$;

create or replace function is_donation_volunteer(p_donation_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from pickup_tasks where donation_id = p_donation_id and volunteer_id = uid); $$;

create or replace function is_claim_claimant(p_claim_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from donation_claims where id = p_claim_id and claimant_id = uid); $$;

create or replace function donation_has_open_task(p_donation_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from pickup_tasks where donation_id = p_donation_id and status = 'open'); $$;

create or replace function donation_status_of(p_donation_id uuid)
returns donation_status language sql stable security definer
set search_path = public, pg_temp
as $$ select status from donations where id = p_donation_id; $$;

create or replace function is_org_member(p_org_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from organization_members where organization_id = p_org_id and profile_id = uid); $$;

create or replace function is_org_admin(p_org_id uuid, uid uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_org_id and profile_id = uid and org_role in ('owner', 'admin')
  );
$$;

create or replace function org_verification_unchanged(
  p_org_id uuid, p_status org_verification_status, p_by uuid, p_at timestamptz
)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organizations o
    where o.id = p_org_id
      and o.verification_status = p_status
      and o.verified_by is not distinct from p_by
      and o.verified_at is not distinct from p_at
  );
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'is_donation_donor(uuid, uuid)', 'is_donation_claimant(uuid, uuid)',
    'is_donation_volunteer(uuid, uuid)', 'is_claim_claimant(uuid, uuid)',
    'donation_status_of(uuid)', 'donation_has_open_task(uuid)', 'is_org_member(uuid, uuid)', 'is_org_admin(uuid, uuid)',
    'org_verification_unchanged(uuid, org_verification_status, uuid, timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ------------------------------------------------------------
-- donations
-- ------------------------------------------------------------
drop policy if exists "donations_select" on donations;
create policy "donations_select"
  on donations for select
  to authenticated
  using (
    status = 'available'
    or donor_id = auth.uid()
    or is_admin(auth.uid())
    or is_donation_claimant(id, auth.uid())
    or is_donation_volunteer(id, auth.uid())
    -- lets anyone see the donation behind an open delivery task
    or donation_has_open_task(id)
  );

drop policy if exists "donations_update_donor_draft_available" on donations;
create policy "donations_update_donor_draft_available"
  on donations for update
  to authenticated
  using (donor_id = auth.uid() and status in ('draft', 'available'))
  with check (
    donor_id = auth.uid()
    and status = donation_status_of(id)
  );

-- ------------------------------------------------------------
-- donation_images
-- ------------------------------------------------------------
drop policy if exists "donation_images_select" on donation_images;
create policy "donation_images_select"
  on donation_images for select
  to authenticated
  using (
    is_admin(auth.uid())
    or is_donation_donor(donation_id, auth.uid())
    or is_donation_claimant(donation_id, auth.uid())
    or is_donation_volunteer(donation_id, auth.uid())
    or donation_status_of(donation_id) = 'available'
  );

-- ------------------------------------------------------------
-- donation_claims / pickup_tasks
-- ------------------------------------------------------------
drop policy if exists "claims_select" on donation_claims;
create policy "claims_select"
  on donation_claims for select
  to authenticated
  using (
    claimant_id = auth.uid()
    or is_admin(auth.uid())
    or is_donation_donor(donation_id, auth.uid())
  );

drop policy if exists "tasks_select" on pickup_tasks;
create policy "tasks_select"
  on pickup_tasks for select
  to authenticated
  using (
    volunteer_id = auth.uid()
    or is_admin(auth.uid())
    or is_donation_donor(donation_id, auth.uid())
    or is_claim_claimant(claim_id, auth.uid())
    -- open delivery tasks are visible to everyone so anyone can volunteer
    or status = 'open'
  );

-- ------------------------------------------------------------
-- organizations / organization_members
-- ------------------------------------------------------------
drop policy if exists "org_members_select" on organization_members;
create policy "org_members_select"
  on organization_members for select
  to authenticated
  using (
    profile_id = auth.uid()
    or is_admin(auth.uid())
    or is_org_member(organization_id, auth.uid())
  );

drop policy if exists "org_members_delete" on organization_members;
create policy "org_members_delete"
  on organization_members for delete
  to authenticated
  using (
    profile_id = auth.uid()
    or is_org_admin(organization_id, auth.uid())
  );

drop policy if exists "organizations_update_owner_admin" on organizations;
create policy "organizations_update_owner_admin"
  on organizations for update
  to authenticated
  using (is_org_admin(id, auth.uid()))
  with check (org_verification_unchanged(id, verification_status, verified_by, verified_at));

-- ------------------------------------------------------------
-- Anyone can accept a delivery task (no more 'volunteer' account type)
-- ------------------------------------------------------------
create or replace function accept_pickup_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated_rows int;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
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
