-- ============================================================
-- Phase 3: Core Domain Schema, RLS, and Lifecycle RPCs
-- Food Waste Management System
-- ============================================================

create extension if not exists cube;
create extension if not exists earthdistance;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type org_verification_status as enum ('pending', 'verified', 'rejected', 'suspended');

create type donation_status as enum (
  'draft', 'available', 'claimed', 'pickup_assigned',
  'picked_up', 'delivered', 'completed',
  'cancelled', 'expired', 'rejected'
);

create type claim_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
create type fulfillment_method as enum ('self_pickup', 'volunteer_assisted');
create type pickup_task_status as enum (
  'open', 'assigned', 'en_route_pickup', 'picked_up',
  'en_route_delivery', 'delivered', 'cancelled'
);
create type food_category as enum (
  'cooked_meals', 'bakery', 'produce', 'dairy', 'packaged',
  'beverages', 'grains_staples', 'other'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ------------------------------------------------------------
-- ORGANIZATIONS
-- ------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  org_type text not null check (org_type in
    ('ngo','food_bank','restaurant','hotel','shop','supermarket','event_organizer','other')),
  registration_number text,
  description text,
  verification_status org_verification_status not null default 'pending',
  verified_by uuid references profiles(id) on delete set null,
  verified_at timestamptz,
  address text,
  latitude double precision,
  longitude double precision,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orgs_verification on organizations(verification_status);
create index idx_orgs_location on organizations using gist (ll_to_earth(latitude, longitude));

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  org_role text not null default 'member' check (org_role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

-- ------------------------------------------------------------
-- DONATIONS
-- ------------------------------------------------------------
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references profiles(id) on delete restrict,
  organization_id uuid references organizations(id) on delete set null,

  title text not null check (char_length(title) between 2 and 140),
  description text,
  category food_category not null,

  quantity_value numeric not null check (quantity_value > 0),
  quantity_unit text not null check (quantity_unit in ('servings','kg','items','liters')),

  is_vegetarian boolean,
  allergens text[],
  storage_requirement text check (storage_requirement in ('room_temp','refrigerated','frozen')),
  packaging_condition text,

  prepared_at timestamptz,
  expires_at timestamptz not null,
  pickup_window_start timestamptz not null,
  pickup_window_end timestamptz not null,

  pickup_address text not null,
  latitude double precision not null,
  longitude double precision not null,

  status donation_status not null default 'draft',
  cancellation_reason text,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_pickup_window check (pickup_window_end > pickup_window_start),
  constraint chk_expiry_after_prepared check (prepared_at is null or expires_at > prepared_at),
  constraint chk_pickup_end_before_expiry check (pickup_window_end <= expires_at)
);
create index idx_donations_status on donations(status);
create index idx_donations_pickup_window_end on donations(pickup_window_end);
create index idx_donations_donor on donations(donor_id);
create index idx_donations_location on donations using gist (ll_to_earth(latitude, longitude));

create table donation_images (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  storage_path text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_donation_images_donation on donation_images(donation_id);

-- ------------------------------------------------------------
-- CLAIMS
-- ------------------------------------------------------------
create table donation_claims (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete restrict,
  organization_id uuid references organizations(id) on delete set null,

  fulfillment_method fulfillment_method not null,

  status claim_status not null default 'pending',
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_claims_donation on donation_claims(donation_id);
create index idx_claims_claimant on donation_claims(claimant_id);
create index idx_claims_status on donation_claims(status);

create unique index uq_one_pending_claim_per_claimant
  on donation_claims (donation_id, claimant_id) where status = 'pending';
create unique index uq_one_accepted_claim_per_donation
  on donation_claims (donation_id) where status = 'accepted';

-- ------------------------------------------------------------
-- PICKUP TASKS (volunteer_assisted fulfillment only)
-- ------------------------------------------------------------
create table pickup_tasks (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  claim_id uuid not null references donation_claims(id) on delete cascade,
  volunteer_id uuid references profiles(id) on delete restrict,

  status pickup_task_status not null default 'open',
  pickup_confirmed_at timestamptz,
  delivered_confirmed_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_status on pickup_tasks(status);
create index idx_tasks_volunteer on pickup_tasks(volunteer_id);
create index idx_tasks_donation on pickup_tasks(donation_id);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_donation_id uuid references donations(id) on delete set null,
  related_claim_id uuid references donation_claims(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient on notifications(recipient_id, is_read);

-- ------------------------------------------------------------
-- SAVED DONATIONS
-- ------------------------------------------------------------
create table saved_donations (
  profile_id uuid not null references profiles(id) on delete cascade,
  donation_id uuid not null references donations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, donation_id)
);

-- ------------------------------------------------------------
-- REPORTS
-- ------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete restrict,
  reported_donation_id uuid references donations(id) on delete cascade,
  reported_profile_id uuid references profiles(id) on delete set null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_report_target check (
    reported_donation_id is not null or reported_profile_id is not null
  )
);
create index idx_reports_status on reports(status);

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_audit_actor on audit_logs(actor_id);

-- ------------------------------------------------------------
-- updated_at triggers (reuses set_updated_at() from 0001)
-- ------------------------------------------------------------
create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger trg_donations_updated_at
  before update on donations
  for each row execute function set_updated_at();

create trigger trg_donation_claims_updated_at
  before update on donation_claims
  for each row execute function set_updated_at();

create trigger trg_pickup_tasks_updated_at
  before update on pickup_tasks
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- handle_new_organization() — creator becomes owner automatically.
-- No client-side path to organization_members INSERT exists at all
-- other than this trigger and add_organization_member() below.
-- ------------------------------------------------------------
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into organization_members (organization_id, profile_id, org_role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on organizations
  for each row execute function handle_new_organization();

-- ============================================================
-- RLS
-- ============================================================
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table donations enable row level security;
alter table donation_images enable row level security;
alter table donation_claims enable row level security;
alter table pickup_tasks enable row level security;
alter table notifications enable row level security;
alter table saved_donations enable row level security;
alter table reports enable row level security;
alter table audit_logs enable row level security;

-- ---------------- organizations ----------------
create policy "organizations_select_all"
  on organizations for select
  to authenticated
  using (true);

create policy "organizations_insert_self"
  on organizations for insert
  to authenticated
  with check (created_by = auth.uid());

-- Owner/admin members can edit ordinary fields, but never the
-- verification columns — those are exclusively set by verify_organization().
create policy "organizations_update_owner_admin"
  on organizations for update
  to authenticated
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = organizations.id
        and m.profile_id = auth.uid()
        and m.org_role in ('owner', 'admin')
    )
  )
  with check (
    verification_status = (select o2.verification_status from organizations o2 where o2.id = organizations.id)
    and verified_by is not distinct from (select o2.verified_by from organizations o2 where o2.id = organizations.id)
    and verified_at is not distinct from (select o2.verified_at from organizations o2 where o2.id = organizations.id)
  );
-- No DELETE policy — organizations are never hard-deleted; suspension is a
-- verification_status value, set via verify_organization().

-- ---------------- organization_members ----------------
create policy "org_members_select"
  on organization_members for select
  to authenticated
  using (
    profile_id = auth.uid()
    or is_admin(auth.uid())
    or exists (
      select 1 from organization_members m
      where m.organization_id = organization_members.organization_id
        and m.profile_id = auth.uid()
    )
  );

-- No client-side INSERT policy — membership is created only by
-- handle_new_organization() (owner) or add_organization_member() (invites).

create policy "org_members_delete"
  on organization_members for delete
  to authenticated
  using (
    profile_id = auth.uid()  -- leave the org
    or exists (
      select 1 from organization_members m
      where m.organization_id = organization_members.organization_id
        and m.profile_id = auth.uid()
        and m.org_role in ('owner', 'admin')
    )
  );
-- No direct UPDATE policy — role changes go through update_member_role().

-- ---------------- donations ----------------
create policy "donations_select"
  on donations for select
  to authenticated
  using (
    status = 'available'
    or donor_id = auth.uid()
    or is_admin(auth.uid())
    or exists (
      select 1 from donation_claims c
      where c.donation_id = donations.id and c.claimant_id = auth.uid()
    )
    or exists (
      select 1 from pickup_tasks t
      where t.donation_id = donations.id and t.volunteer_id = auth.uid()
    )
  );

create policy "donations_insert_self"
  on donations for insert
  to authenticated
  with check (donor_id = auth.uid());

-- Donor can edit ordinary content fields, but only while still
-- draft/available, and never the status column through this policy.
create policy "donations_update_donor_draft_available"
  on donations for update
  to authenticated
  using (donor_id = auth.uid() and status in ('draft', 'available'))
  with check (
    donor_id = auth.uid()
    and status = (select d2.status from donations d2 where d2.id = donations.id)
  );
-- All status transitions (publish, claimed, picked_up, delivered, completed,
-- cancelled, expired, rejected) go exclusively through the RPCs below —
-- there is no direct client update policy that can touch `status`.

-- ---------------- donation_images ----------------
create policy "donation_images_select"
  on donation_images for select
  to authenticated
  using (
    exists (
      select 1 from donations d
      where d.id = donation_images.donation_id
        and (
          d.status = 'available' or d.donor_id = auth.uid() or is_admin(auth.uid())
          or exists (select 1 from donation_claims c where c.donation_id = d.id and c.claimant_id = auth.uid())
          or exists (select 1 from pickup_tasks t where t.donation_id = d.id and t.volunteer_id = auth.uid())
        )
    )
  );

create policy "donation_images_insert_donor_draft_available"
  on donation_images for insert
  to authenticated
  with check (
    exists (
      select 1 from donations d
      where d.id = donation_images.donation_id
        and d.donor_id = auth.uid()
        and d.status in ('draft', 'available')
    )
  );

create policy "donation_images_delete_donor_draft_available"
  on donation_images for delete
  to authenticated
  using (
    exists (
      select 1 from donations d
      where d.id = donation_images.donation_id
        and d.donor_id = auth.uid()
        and d.status in ('draft', 'available')
    )
  );

create policy "donation_images_update_donor_draft_available"
  on donation_images for update
  to authenticated
  using (
    exists (
      select 1 from donations d
      where d.id = donation_images.donation_id
        and d.donor_id = auth.uid()
        and d.status in ('draft', 'available')
    )
  );

-- ---------------- donation_claims ----------------
create policy "claims_select"
  on donation_claims for select
  to authenticated
  using (
    claimant_id = auth.uid()
    or is_admin(auth.uid())
    or exists (select 1 from donations d where d.id = donation_claims.donation_id and d.donor_id = auth.uid())
  );
-- INSERT/UPDATE are RPC-only (create_claim, accept_claim, reject_claim,
-- cancel_claim) — no direct client write policy exists. No DELETE ever.

-- ---------------- pickup_tasks ----------------
create policy "tasks_select"
  on pickup_tasks for select
  to authenticated
  using (
    volunteer_id = auth.uid()
    or is_admin(auth.uid())
    or exists (select 1 from donations d where d.id = pickup_tasks.donation_id and d.donor_id = auth.uid())
    or exists (select 1 from donation_claims c where c.id = pickup_tasks.claim_id and c.claimant_id = auth.uid())
  );
-- INSERT/UPDATE are RPC-only (create_pickup_task via accept_claim,
-- accept_pickup_task, update_task_status). No DELETE ever.

-- ---------------- notifications ----------------
create policy "notifications_select_self"
  on notifications for select
  to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_update_self_is_read"
  on notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications_delete_self"
  on notifications for delete
  to authenticated
  using (recipient_id = auth.uid());
-- No client-side INSERT policy — notifications are always a side effect
-- of a lifecycle RPC, inserted with the RPC's elevated privilege.

-- ---------------- saved_donations ----------------
create policy "saved_select_self"
  on saved_donations for select
  to authenticated
  using (profile_id = auth.uid());

create policy "saved_insert_self"
  on saved_donations for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "saved_delete_self"
  on saved_donations for delete
  to authenticated
  using (profile_id = auth.uid());

-- ---------------- reports ----------------
create policy "reports_select_own_or_admin"
  on reports for select
  to authenticated
  using (reporter_id = auth.uid() or is_admin(auth.uid()));

create policy "reports_insert_self"
  on reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "reports_update_admin_only"
  on reports for update
  to authenticated
  using (is_admin(auth.uid()));
-- No DELETE policy — moderation history is permanent.

-- ---------------- audit_logs ----------------
create policy "audit_select_admin_only"
  on audit_logs for select
  to authenticated
  using (is_admin(auth.uid()));
-- No INSERT/UPDATE/DELETE policy for any client role — every write comes
-- from a SECURITY DEFINER function using its elevated privilege, and rows
-- are append-only (no UPDATE/DELETE path exists for anyone, including admin).

-- ============================================================
-- RPCs — donation & claim lifecycle
-- ============================================================

-- publish_donation(): draft -> available. Simple enough not to need the
-- full transition-allow-list machinery below, but still RPC-gated because
-- `status` is excluded from the direct update policy.
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

-- create_claim(): the only writer of donation_claims INSERTs.
create or replace function create_claim(
  p_donation_id uuid,
  p_fulfillment_method fulfillment_method,
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

  insert into donation_claims (donation_id, claimant_id, fulfillment_method, message)
  values (p_donation_id, auth.uid(), p_fulfillment_method, p_message)
  returning id into v_claim_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id, related_claim_id)
  values (
    v_donation.donor_id, 'claim_received', 'New claim on your donation',
    'Someone has requested "' || v_donation.title || '".', p_donation_id, v_claim_id
  );

  return v_claim_id;
end;
$$;

-- accept_claim(): donor accepts exactly one claim. Atomically rejects
-- siblings, advances the donation, and creates a pickup_task when the
-- claimant requested volunteer-assisted fulfillment.
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

  -- Relies on uq_one_accepted_claim_per_donation to fail loudly if a race
  -- already accepted a different claim on this donation.
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

create or replace function cancel_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim donation_claims%rowtype;
begin
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

-- confirm_self_pickup(): the entire self-pickup completion event.
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

-- confirm_delivery(): completes the volunteer-assisted flow after DELIVERED.
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

-- cancel_donation(): shared cancellation path for both fulfillment methods.
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

  if not v_is_donor and not v_is_claimant then
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

-- ============================================================
-- RPCs — volunteer pickup task lifecycle
-- ============================================================

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
  select role into v_role from profiles where id = auth.uid();
  if v_role != 'volunteer' then
    raise exception 'only volunteers can accept pickup tasks';
  end if;

  -- Atomic conditional update: only one caller can ever win this race.
  update pickup_tasks
  set status = 'assigned', volunteer_id = auth.uid()
  where id = p_task_id and status = 'open' and volunteer_id is null;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'this task is no longer available';
  end if;
end;
$$;

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
  select * into v_task from pickup_tasks where id = p_task_id for update;
  if v_task.id is null or v_task.volunteer_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  -- Explicit allow-list of valid task-status transitions.
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

-- ============================================================
-- RPCs — organization membership (invite-only, §5)
-- ============================================================

create or replace function add_organization_member(
  p_org_id uuid,
  p_target_profile_id uuid,
  p_new_org_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_role text;
begin
  select org_role into v_caller_role
  from organization_members
  where organization_id = p_org_id and profile_id = auth.uid();

  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'not authorized to add members to this organization';
  end if;

  if p_new_org_role not in ('member', 'admin') then
    raise exception 'invalid org role';
  end if;

  insert into organization_members (organization_id, profile_id, org_role)
  values (p_org_id, p_target_profile_id, p_new_org_role)
  on conflict (organization_id, profile_id) do nothing;

  insert into notifications (recipient_id, type, title, body)
  values (p_target_profile_id, 'org_invited', 'Added to an organization', 'You were added to an organization.');
end;
$$;
revoke execute on function add_organization_member(uuid, uuid, text) from public;
grant execute on function add_organization_member(uuid, uuid, text) to authenticated;

create or replace function update_member_role(p_org_id uuid, p_target_profile_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_role text;
begin
  select org_role into v_caller_role
  from organization_members
  where organization_id = p_org_id and profile_id = auth.uid();

  if v_caller_role != 'owner' then
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

-- ============================================================
-- RPCs — admin moderation
-- ============================================================

create or replace function verify_organization(p_org_id uuid, p_decision org_verification_status)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_decision not in ('verified', 'rejected', 'suspended') then
    raise exception 'invalid decision';
  end if;

  update organizations
  set verification_status = p_decision, verified_by = auth.uid(), verified_at = now()
  where id = p_org_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'organization.verification_' || p_decision, 'organizations', p_org_id, null);
end;
$$;
revoke execute on function verify_organization(uuid, org_verification_status) from public;
grant execute on function verify_organization(uuid, org_verification_status) to authenticated;

create or replace function admin_reject_donation(p_donation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_donor_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select donor_id into v_donor_id from donations where id = p_donation_id;
  if v_donor_id is null then
    raise exception 'donation not found';
  end if;

  update donations set status = 'rejected', rejection_reason = p_reason where id = p_donation_id;

  insert into notifications (recipient_id, type, title, body, related_donation_id)
  values (v_donor_id, 'donation_rejected', 'Donation removed', p_reason, p_donation_id);

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'donation.rejected', 'donations', p_donation_id, jsonb_build_object('reason', p_reason));
end;
$$;
revoke execute on function admin_reject_donation(uuid, text) from public;
grant execute on function admin_reject_donation(uuid, text) to authenticated;

create or replace function resolve_report(p_report_id uuid, p_decision report_status)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_decision not in ('resolved', 'dismissed', 'reviewing') then
    raise exception 'invalid decision';
  end if;

  update reports
  set status = p_decision, resolved_by = auth.uid(), resolved_at = now()
  where id = p_report_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'report.' || p_decision, 'reports', p_report_id, null);
end;
$$;
revoke execute on function resolve_report(uuid, report_status) from public;
grant execute on function resolve_report(uuid, report_status) to authenticated;

-- ------------------------------------------------------------
-- deactivate_account(): soft-delete / anonymization, §5 of the
-- architecture. Never a hard delete of the profiles row.
-- ------------------------------------------------------------
create or replace function deactivate_account(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() != p_target_profile_id and not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

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
-- get_pickup_contact_info(): scoped phone disclosure between the
-- legitimate parties on one specific donation. See §2 of the architecture.
-- ------------------------------------------------------------
create or replace function get_pickup_contact_info(p_target_profile_id uuid, p_donation_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_related boolean;
begin
  select exists (
    select 1 from donations d
    left join donation_claims c on c.donation_id = d.id and c.status = 'accepted'
    left join pickup_tasks t on t.donation_id = d.id
    where d.id = p_donation_id
      and auth.uid() in (d.donor_id, c.claimant_id, t.volunteer_id)
      and p_target_profile_id in (d.donor_id, c.claimant_id, t.volunteer_id)
      and p_target_profile_id != auth.uid()
  ) into v_is_related;

  if not v_is_related then
    raise exception 'not authorized to view this contact information';
  end if;

  return (select phone from profile_private where profile_id = p_target_profile_id);
end;
$$;
revoke execute on function get_pickup_contact_info(uuid, uuid) from public;
grant execute on function get_pickup_contact_info(uuid, uuid) to authenticated;

-- ============================================================
-- Location — nearby_donations(), invoker rights only (reads rows
-- already visible under normal SELECT RLS, no privilege boundary
-- to cross).
-- ============================================================
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
    and earth_box(ll_to_earth(user_lat, user_lng), radius_m) @> ll_to_earth(d.latitude, d.longitude)
    and earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) <= radius_m
  order by earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) asc;
$$;
revoke execute on function nearby_donations(double precision, double precision, integer) from public;
grant execute on function nearby_donations(double precision, double precision, integer) to authenticated;

-- ------------------------------------------------------------
-- provision_admin() now that audit_logs exists — supersedes the
-- Phase 2 version via CREATE OR REPLACE (0001's file is left
-- untouched; this is an additive migration, not an edit to an
-- already-applied one).
-- ------------------------------------------------------------
create or replace function provision_admin(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  update profiles set role = 'admin', updated_at = now()
  where id = target_profile_id;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'user.promoted_to_admin', 'profiles', target_profile_id, null);
end;
$$;
