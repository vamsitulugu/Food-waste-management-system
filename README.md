# Second Serving — Food Waste Management System

A production-oriented web app connecting donors, recipients, NGOs/food banks, and volunteers
so surplus food gets distributed instead of wasted. Built on React + Vite + TypeScript +
Tailwind and Supabase (Postgres, Auth, RLS, Storage, Realtime).

This README is the complete setup guide. Follow it in order — later steps depend on earlier ones.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A free Supabase account (https://supabase.com)
- The Supabase CLI: `npm install -g supabase`

---

## 2. Create the Supabase project

1. Go to https://supabase.com/dashboard → New Project.
2. Pick a name, database password (save it somewhere), and region.
3. Wait for provisioning to finish (a couple of minutes).
4. In the project dashboard, go to **Project Settings → API** and note down:
   - **Project URL**
   - **anon / public key**

Do not use the **service_role** key anywhere in this frontend project — it must never appear
in client code or `VITE_`-prefixed environment variables.

**Optional — skip email confirmation on signup** (handy for local development/testing; think
twice before leaving this off in a real production launch, since it lets people sign up with
addresses they don't actually control):

- Dashboard → **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email".
- No app code change is needed either way — `SignupForm` already checks whether Supabase
  returned an active session on signup and routes straight into the app when it does, or shows
  a "check your email" screen when it doesn't. It adapts automatically to this setting.

---

## 3. Apply the database migrations

The schema, security policies, and all business logic live entirely in
`supabase/migrations/`, applied in order:

| File | What it does |
|---|---|
| `0001_phase2_auth.sql` | `user_role` enum, `profiles`/`profile_private`, the signup trigger with a hard-coded role allow-list, `is_admin()`, `provision_admin()`, RLS |
| `0002_phase3_schema.sql` | Full domain schema — organizations, donations, claims, pickup tasks, notifications, saved donations, reports, audit logs — every RLS policy and every lifecycle RPC |
| `0003_phase5_storage.sql` | The `donation-images` Storage bucket + RLS, and `sweep_expired_donations()` |
| `0004_security_hardening.sql` | Fixes an authorization bug found in a follow-up security audit (see §9), adds organization-attributed claims, adds the `avatars` Storage bucket |
| `0005_deferred_role_selection.sql` | Moves role selection from the signup form to a post-login `/choose-role` screen — `profiles.role` becomes nullable, `set_initial_role()` is the one-time RPC that sets it |

**Apply them:**

```bash
supabase login
supabase link --project-ref <your-project-ref>   # ref is in your project URL / dashboard
supabase db push
```

This runs all five files against your Supabase Postgres database. If you ever add more
migrations later, `supabase db push` only applies the ones not yet run.

**Enable the scheduled expiry sweep** (donations whose pickup window passes with no accepted
claim get marked `expired` and the donor is notified):

- Dashboard → **Database → Extensions** → enable `pg_cron`.
- Then run this once in the SQL editor:
  ```sql
  select cron.schedule('sweep-expired-donations', '*/5 * * * *', 'select sweep_expired_donations();');
  ```
- If your plan/region doesn't support `pg_cron`, trigger `sweep_expired_donations()` from an
  external scheduler instead (e.g. a cron-triggered Supabase Edge Function using the service
  role key — never the anon key, since this function is intentionally not grantable to
  `authenticated` or `anon`).

---

## 4. Configure the frontend

```bash
cd food-waste-app
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

Run it:

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

---

## 5. Bootstrap your first admin account

No admin exists yet, and by design nothing in the app can create one — `admin` isn't a
selectable option on `/choose-role`, `set_initial_role()`'s own allow-list rejects it even if
someone tampered with the request, and `provision_admin()` requires an existing admin to call
it. This one step is intentionally manual and out-of-band:

1. Sign up normally in the app — you'll land on the "how will you use the platform?" screen;
   pick any option, it doesn't matter, you're about to overwrite it with `admin` directly.
2. In the Supabase dashboard, go to **Table Editor → profiles** (or the SQL editor) and find
   your user's `id`.
3. Run in the SQL editor:
   ```sql
   update profiles set role = 'admin' where id = '<your-user-uuid>';
   ```
4. Sign out and back in (or refresh) — you'll now see the **Admin** link in the nav.

Every admin after this one should be created from `/admin/users` → "Promote to admin" (or the
`provision_admin()` RPC directly) by an existing admin — never by repeating this manual step.

---

## 6. Verify your setup

Run through this checklist to confirm everything is wired correctly:

1. **Signup/roles**: create a new account (name/email/password only — no role field on
   signup). Confirm you're redirected to `/choose-role` on first login, and that skipping it
   (e.g. navigating straight to `/dashboard` by URL) bounces you back to it. Pick a role and
   confirm you land on a role-appropriate dashboard afterward, and that revisiting
   `/choose-role` directly now redirects you to `/dashboard` instead (one-time only). Repeat
   for all four public roles across separate accounts.
2. **Donation lifecycle**: as the donor, create a donation (`/donations/new`), upload a photo,
   publish it. Confirm it's invisible to other accounts until published.
3. **Claim + realtime**: as the recipient, browse to it and submit a claim. Confirm the donor
   sees the new request appear on the donation page **without refreshing**.
4. **Accept + fulfillment**: accept the claim as the donor. If self-pickup, confirm the
   recipient can mark it picked up. If volunteer-assisted, confirm a task appears under
   `/volunteer/tasks` for the volunteer account, and walk it through the full status stepper.
5. **Organizations**: create an organization as the NGO account (`/organizations/new`) — you
   become `owner` automatically. Confirm a second account cannot see or join it uninvited (no
   join button exists anywhere). Copy that second account's Profile ID from `/profile` and add
   them as a member from the organization page.
6. **Org-attributed claims**: as a member of that organization, submit a claim on a donation and
   choose the organization under "Claiming as" — confirm the donor sees "on behalf of
   `<org name>`" on the request.
7. **Saved donations**: bookmark a donation from its detail page; confirm it shows up under
   `/saved`.
8. **Reports & moderation**: report a donation as a recipient; as the admin, either dismiss it
   or remove the donation from `/admin/reports`, and confirm the donor is notified on removal.
9. **Admin surface**: confirm `/admin`, `/admin/organizations`, `/admin/reports`,
   `/admin/donations`, `/admin/users`, and `/admin/audit-log` are all reachable as admin and
   redirect away for every other role.
10. **RLS spot-check**: in the Supabase dashboard, confirm every table under **Table Editor**
    shows a shield/RLS-enabled icon — there should be no table with RLS disabled.

---

## 7. What's implemented, by phase

**Phase 2 — Auth & roles.** Signup collects only name/email/password. Role (Donor, Recipient,
NGO, Volunteer) is chosen **inside the app on first login**, via `/choose-role` — not on the
signup form (`0005_deferred_role_selection.sql`). `profiles.role` is nullable until then;
`RequireAuth` redirects any role-required route to `/choose-role` while it's unset, and
`set_initial_role()` is a one-time RPC (rejects a second call once a role exists) that
structurally cannot produce `admin` — same guarantee as the old signup-time trigger, just moved
to a different screen. Login/logout, session persistence unchanged.

**Phase 3 — Schema & security.** Full schema + RLS matrix + lifecycle RPCs for every domain
table: manual-only claim acceptance, dual fulfillment paths (self-pickup vs. volunteer-assisted),
invite-only organization membership, scoped phone disclosure between active-transaction parties
only, admin moderation, soft-delete/anonymization.

**Phase 4 — Profiles & organizations.** `/profile` (name, private phone, avatar, profile-ID
sharing, deactivation) and `/organizations` (create, list, detail, invite-only membership).

**Phase 5 — Donation creation.** Full form with food-safety fields, explicit-consent browser
geolocation for pickup coordinates, private Storage image upload, publish/cancel, `/my-donations`.

**Phase 6 — Discovery.** `/browse`: search, category/diet filters, sort, and a "near me" mode
using `nearby_donations()` (cube/earthdistance).

**Phase 7 — Claims.** Submit with a stated fulfillment method (and, if applicable, on behalf of
an organization you belong to), donor review/accept/reject, withdraw, self-pickup and
volunteer-delivery confirmation flows.

**Phase 8 — Realtime.** Postgres Changes wired into Browse, donation detail, My Requests, My
Tasks, and notifications — no polling.

**Phase 9 — Location matching.** Browser geolocation requested only on explicit click, used in
exactly two places (donation form, browse "near me" toggle).

**Phase 10 — Notifications.** Live bell + full `/notifications` page.

**Phase 11 — Volunteer workflow.** `/volunteer/tasks` (open tasks, race-safe accept),
`/volunteer/my-tasks` (status stepper).

**Phase 12 — Admin.** Stats, organization verification, report moderation, a general donation
browse/moderate view, user management (deactivate/promote), and an audit-log viewer — all
route-guarded and backed by RLS/RPCs that re-check `is_admin()` server-side regardless of the
frontend guard.

**Phase 13 — Analytics.** Basic platform counts on the admin dashboard via `count`-only queries.

**Saved donations.** Bookmark any donation; `/saved` lists them.

**Avatar upload.** Private `avatars` Storage bucket, own-file-only RLS, resolved via signed URL.

**Not built / explicitly deferred:**
- Phase 14 (automated test suite — Vitest/Playwright/RLS-policy tests) and Phase 15 (actual
  hosting deployment) — there's no CI or hosting account available in the environment this was
  built in to run either against. What *was* done instead: every migration was applied to a
  real local PostgreSQL instance and several of the most safety-critical behaviors were
  functionally proven (see §9) rather than only reasoned about; `tsc`/`lint`/`build` were run
  after every phase. This is real verification, but it isn't a substitute for CI or a second
  party's security review.
- Email/push notification fan-out (the notification-insert path is centralized specifically so
  this can be added later without touching call sites — see the architecture doc).
- Organization invites are by profile ID, not an email-based invite flow.

---

## 8. Project structure

```
src/
  api/          Typed wrappers around Supabase queries/RPCs (one file per domain)
  components/   UI components, grouped by domain (auth/, donations/, claims/, volunteer/,
                 notifications/, admin/, organizations/, common/)
  context/      AuthProvider, ToastProvider
  hooks/        useAsyncData, useRealtimeTable, useGeolocation
  lib/          supabaseClient.ts
  pages/        Route-level components (pages/admin/ for the admin sub-app)
  routes/       RequireAuth guard
  types/        database.ts (Supabase schema types) + domain.ts (app-level types)
  utils/        formatDate.ts, formatDistance.ts
supabase/
  migrations/   SQL migrations, applied via `supabase db push`, listed in §3
```

---

## 9. Security audit findings (fixed in `0004_security_hardening.sql`)

A follow-up review of the full codebase found a real authorization bug, not a cosmetic one:
several RPCs used the pattern `IF column != auth.uid() THEN RAISE EXCEPTION`. In PL/pgSQL, `IF`
treats a NULL condition the same as FALSE — it silently skips the exception. When `auth.uid()`
is NULL (an unauthenticated `anon`-role caller), `column != NULL` evaluates to NULL, so the
authorization check silently passed. Several of these functions were *also* missing the
`REVOKE EXECUTE ... FROM PUBLIC` lockdown that would otherwise have blocked `anon` from calling
them at all.

This was verified as a real, reproducible issue (not just a theoretical read of the code): before
the fix, calling `publish_donation()` with no session (simulating an anonymous caller) succeeded
and published another user's private draft donation. After the fix, the same call correctly
fails with `authentication required`.

**Fixed in `0004`:** every affected function (`publish_donation`, `create_claim`,
`accept_claim`, `reject_claim`, `cancel_claim`, `confirm_self_pickup`, `confirm_delivery`,
`cancel_donation`, `accept_pickup_task`, `update_task_status`, `update_member_role`,
`provision_admin`) now has both an explicit `IF auth.uid() IS NULL THEN RAISE EXCEPTION` guard
(correct regardless of grants) and the `REVOKE`/`GRANT` lockdown (the actual access-control
layer). Both were verified against real Postgres after the fix, including a direct functional
test of the exploit path described above.

If you're auditing this codebase further, the pattern to grep for in any new
`SECURITY DEFINER` function is: does every `auth.uid()` comparison either (a) sit behind an
`auth.uid() IS NULL` guard at the top of the function, or (b) go through a NULL-safe helper like
`is_admin()` (which is `EXISTS`-based and never returns NULL)? If neither, it's a latent bug of
this same class. `set_initial_role()` (added in `0005`) follows this pattern from the start —
it guards on `auth.uid() IS NULL` before doing anything else.

---

## 10. Known limitations

- The production JS bundle is a single ~550KB chunk (~150KB gzipped) — Vite warns about this.
  Route-based code-splitting (`React.lazy` per page) would address it; not done, since it
  affects only initial load time, not correctness.
- Organization invites are by profile ID, not email lookup (documented `[FUTURE]` item in the
  architecture, not an oversight).
- No automated test suite (see §7, "Not built").
- `pickup_tasks.notes` exists in the schema for a volunteer to leave delivery notes, but there's
  no UI for it yet.
- Bucket/food-safety legal language is informational only — this app does not encode or claim
  to enforce any jurisdiction's actual food-safety regulations. If deploying for real use,
  have the food-safety and liability language reviewed for your specific region.
