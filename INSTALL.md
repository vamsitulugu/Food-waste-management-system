# Help chatbot: install

## Option A: apply the patch (recommended)
```bash
cd Food-waste-management-system
git apply help-chatbot.patch
```

## Option B: copy the files from this zip
Copy the `src/` and `supabase/` folders into your project, and replace `src/App.tsx`,
`src/types/database.ts` and `README.md` with the included versions
(only if you have not changed them since; otherwise use the patch).

## Then: run the SQL in Supabase
Either `supabase db push` (picks up `supabase/migrations/0008_help_chatbot.sql`),
or paste `0008_help_chatbot.sql` into Supabase Dashboard -> SQL Editor -> Run.
It is safe to run more than once.

## Run
```bash
npm install
npm run dev
```
An orange chat button appears at the bottom-right of every page.

## Edit answers later (no redeploy)
Supabase -> Table Editor -> `help_faqs`. Add keywords (lower-case) people might type.
Questions the bot could not answer are saved in `help_unanswered`.
