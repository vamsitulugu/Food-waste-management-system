-- ============================================================
-- Defer role selection: signup no longer collects a role.
-- The person picks Donor / Recipient / NGO / Volunteer the first time
-- they land in the app, via a dedicated screen — not on the signup form.
-- ============================================================

-- profiles.role becomes nullable — NULL means "hasn't chosen yet."
-- Existing rows keep whatever role they already have; nothing is reset.
alter table profiles alter column role drop not null;

-- ------------------------------------------------------------
-- handle_new_user() no longer reads a role from signup metadata at all
-- (there's nothing sensible for the client to send anymore — the role
-- picker doesn't exist on the signup form). Every new profile starts
-- with role = NULL until the person chooses one in-app.
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), null);

  insert into profile_private (profile_id, phone)
  values (new.id, null);

  return new;
end;
$$;

-- ------------------------------------------------------------
-- set_initial_role() — the only way a role goes from NULL to a real
-- value. Deliberately NOT reusable to change an already-set role (that
-- stays admin-only via provision_admin(), or a future dedicated RPC if
-- self-service role changes are ever wanted) — this one is strictly
-- "choose once, on first login."
-- 'admin' is not in the allow-list, same as the old signup-time trigger
-- guaranteed — this path can never produce an admin.
-- ------------------------------------------------------------
create or replace function set_initial_role(p_role user_role)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_role user_role;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_role not in ('donor', 'recipient', 'ngo', 'volunteer') then
    raise exception 'invalid role';
  end if;

  select role into v_current_role from profiles where id = auth.uid();
  if v_current_role is not null then
    raise exception 'role has already been set';
  end if;

  update profiles set role = p_role, updated_at = now() where id = auth.uid();
end;
$$;
revoke execute on function set_initial_role(user_role) from public;
grant execute on function set_initial_role(user_role) to authenticated;


