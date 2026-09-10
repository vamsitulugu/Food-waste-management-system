-- ============================================================
-- Phase 5: Storage for donation images + expiry sweep
-- ============================================================

-- Private bucket — access mediated entirely by the policies below, not by
-- guessing an unguessable path. Path convention:
--   {donor_id}/{donation_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'donation-images', 'donation-images', false,
  5242880, -- 5MB, re-checked here even though the client also enforces it
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "donation_images_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from donations d
      where d.id::text = (storage.foldername(name))[2]
        and d.donor_id = auth.uid()
        and d.status in ('draft', 'available')
    )
  );

create policy "donation_images_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'donation-images'
    and exists (
      select 1 from donations d
      where d.id::text = (storage.foldername(name))[2]
        and (
          d.status = 'available' or d.donor_id = auth.uid() or is_admin(auth.uid())
          or exists (select 1 from donation_claims c where c.donation_id = d.id and c.claimant_id = auth.uid())
          or exists (select 1 from pickup_tasks t where t.donation_id = d.id and t.volunteer_id = auth.uid())
        )
    )
  );

create policy "donation_images_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'donation-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from donations d
      where d.id::text = (storage.foldername(name))[2]
        and d.donor_id = auth.uid()
        and d.status in ('draft', 'available')
    )
  );

-- ------------------------------------------------------------
-- sweep_expired_donations() — the only writer of the `expired` status.
-- Not client-callable (no EXECUTE grant to `authenticated`); intended to
-- run on a schedule via pg_cron or an external scheduled invocation using
-- the service role. See README for how to schedule this in Supabase.
-- ------------------------------------------------------------
create or replace function sweep_expired_donations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with expired as (
    update donations
    set status = 'expired'
    where status = 'available' and now() >= pickup_window_end
    returning id, donor_id, title
  )
  insert into notifications (recipient_id, type, title, body, related_donation_id)
  select donor_id, 'donation_expired', 'Donation expired',
         '"' || title || '" passed its pickup window with no accepted claim.', id
  from expired;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function sweep_expired_donations() from public;
revoke execute on function sweep_expired_donations() from authenticated;

-- Attempt to schedule via pg_cron if the extension is available. This can
-- fail on some Supabase plans/regions where pg_cron isn't enabled — if it
-- does, enable "pg_cron" under Database > Extensions in the dashboard and
-- re-run just this block, or trigger sweep_expired_donations() from an
-- external scheduler (e.g. a cron-triggered Edge Function) instead.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('sweep-expired-donations', '*/5 * * * *', 'select sweep_expired_donations();');
exception when others then
  raise notice 'pg_cron scheduling skipped (%). Schedule sweep_expired_donations() externally.', sqlerrm;
end;
$$;
