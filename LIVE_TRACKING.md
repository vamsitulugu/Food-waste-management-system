# Live tracking — setup

1. Supabase Dashboard → SQL Editor → paste `supabase/migrations/0011_live_tracking.sql` → Run.
   (Needs 0009 already applied. Safe to re-run. Enable pg_cron under Database → Extensions for the 30-minute stale-row sweep; tracking works without it.)
2. Confirm `live_locations` is under Database → Replication → `supabase_realtime`.
3. `npm install` then `npm run dev`.

Where it shows: donation detail page, self-pickup requests only, while the donation is `claimed` / `pickup_assigned`.
Deep link: `/donations/<id>#live-tracking` (used by the "Track" button in chat and the "recipient is nearby" notification).
