-- ============================================================
-- Phase 2: Authentication & Profiles
-- Food Waste Management System
-- ============================================================

-- ------------------------------------------------------------
-- ENUM
-- ------------------------------------------------------------
create type user_role as enum ('donor', 'recipient', 'ngo', 'volunteer', 'admin');

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role user_role not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);

create table profile_private (
  profile_id uuid primary key references profiles(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at maintenance
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_profile_private_updated_at
  before update on profile_private
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- is_admin() helper — used inside RLS policies and RPCs.
-- SECURITY DEFINER so it can read `profiles.role` regardless of the
-- caller's own row-level visibility; it has no write surface at all,
-- so there is nothing here to escalate privilege through.
-- ------------------------------------------------------------
create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles where id = uid and role = 'admin'
  );
$$;
revoke execute on function is_admin(uuid) from public;
grant execute on function is_admin(uuid) to authenticated;

-- ------------------------------------------------------------
-- handle_new_user() — the ONLY place `role` is ever set from
-- client-influenced input. `admin` is not in the allow-list, so it
-- is structurally unreachable via signup regardless of what a client
-- sends in auth metadata.
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  safe_role user_role;
begin
  if requested_role in ('donor', 'recipient', 'ngo', 'volunteer') then
    safe_role := requested_role::user_role;
  else
    safe_role := 'donor';
  end if;

  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), safe_role);

  insert into profile_private (profile_id, phone)
  values (new.id, null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- provision_admin() — the only way to create an admin after the
-- initial (manually bootstrapped) one. Admin-gated and audit-logged.
-- audit_logs does not exist until Phase 3/12; this function is
-- created here but the audit insert is added once that table exists
-- (see 0003_admin_audit.sql). For Phase 2 it simply performs the
-- authorized role update.
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
end;
$$;
revoke execute on function provision_admin(uuid) from public;
grant execute on function provision_admin(uuid) to authenticated;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table profile_private enable row level security;

-- profiles: readable by any authenticated user (name/avatar/role only —
-- no sensitive data lives on this table, see profile_private).
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

-- profiles: self-update, but NEVER role or is_active from this policy.
create policy "profiles_update_self_limited"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
    and is_active = (select is_active from profiles where id = auth.uid())
  );

-- profiles: admin can update anything (role changes still go through
-- provision_admin() in practice, but admin needs broader update rights
-- for moderation such as deactivating an account).
create policy "profiles_update_admin"
  on profiles for update
  to authenticated
  using (is_admin(auth.uid()));

-- No client-side INSERT policy on profiles at all — rows are only ever
-- created by the handle_new_user() trigger.
-- No DELETE policy — profiles are never hard-deleted by the app (soft
-- delete/anonymization only, via deactivate_account() in a later phase).

-- profile_private: self or admin only, both for reading and writing.
create policy "profile_private_select_self_or_admin"
  on profile_private for select
  to authenticated
  using (profile_id = auth.uid() or is_admin(auth.uid()));

create policy "profile_private_update_self_or_admin"
  on profile_private for update
  to authenticated
  using (profile_id = auth.uid() or is_admin(auth.uid()));

-- No client-side INSERT/DELETE policy — the row is created by
-- handle_new_user() and lives/dies with the profile via ON DELETE CASCADE.
