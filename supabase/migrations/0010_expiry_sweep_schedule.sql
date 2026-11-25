-- ============================================================
-- 0010 — Make sure expired donations are actually swept
--
-- sweep_expired_donations() (from 0003) marks food whose pickup window has
-- passed as 'expired' and notifies the donor. It only runs if pg_cron is
-- enabled. This script:
--   1. tries to enable pg_cron + (re)schedule the job every 5 minutes
--   2. runs the sweep once right now to clean up anything already stale
--   3. shows you the job so you can confirm it exists
--
-- If step 1 prints a notice, enable "pg_cron" in
-- Dashboard → Database → Extensions, then run this file again.
-- ============================================================
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('sweep-expired-donations');
exception
  when others then null; -- job didn't exist yet, or pg_cron unavailable
end;
$$;

do $$
begin
  perform cron.schedule('sweep-expired-donations', '*/5 * * * *', 'select public.sweep_expired_donations();');
exception
  when others then
    raise notice 'Could not schedule with pg_cron (%). Enable pg_cron under Database > Extensions and re-run.', sqlerrm;
end;
$$;

-- one-off cleanup of already-expired donations
select public.sweep_expired_donations() as donations_expired_now;

-- confirm the schedule (should show 1 row: sweep-expired-donations)
select jobid, jobname, schedule, active from cron.job where jobname = 'sweep-expired-donations';
