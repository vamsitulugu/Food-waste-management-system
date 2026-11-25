# Chat + Call feature — setup (2 minutes)

1. Supabase → SQL Editor → paste and run `supabase/migrations/0009_chat_and_contact.sql`
2. (Optional) run `supabase/seed_chat_demo.sql` to add a sample conversation to your latest accepted request
3. `npm install && npm run dev`

## How it works
- After a donor ACCEPTS a request, the donor, recipient (and volunteer, if assigned) can chat live.
- Chat + call buttons appear on the donation page, and all conversations are under the new **Messages** icon in the top bar (with unread badge).
- Call uses tap-to-call (`tel:`). Numbers are only revealed to people on that accepted pickup.
- Signup now asks for a phone number. Existing users without one see a prompt in the chat to add it in Profile.

## New / changed files
New:  supabase/migrations/0009_chat_and_contact.sql, supabase/seed_chat_demo.sql,
      src/api/chat.ts, src/components/chat/ChatPanel.tsx, src/components/chat/CallButton.tsx,
      src/hooks/useUnreadChats.ts, src/pages/ChatsPage.tsx
Edited: App.tsx, AppShell.tsx, DonationDetailPage.tsx, NotificationsPage.tsx, SignupForm.tsx,
        ContactCard.tsx, api/auth.ts, types/database.ts, types/domain.ts

## Notification redirects
Clicking a notification (bell dropdown or Notifications page) marks it read and opens the right page.
Mapping lives in one file: `src/utils/notificationLink.ts`.
