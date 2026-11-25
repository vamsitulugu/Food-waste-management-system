-- ============================================================
-- OPTIONAL demo data for the new chat feature.
-- Run AFTER 0009_chat_and_contact.sql.
-- Adds a short sample conversation to the most recent accepted
-- request, so you can see the chat UI filled in right away.
-- Does nothing (just prints a notice) if no request is accepted yet.
-- ============================================================
do $$
declare
  v_claim donation_claims%rowtype;
  v_donor uuid;
  v_title text;
begin
  select * into v_claim
  from donation_claims
  where status in ('accepted', 'completed')
  order by coalesce(responded_at, created_at) desc
  limit 1;

  if v_claim.id is null then
    raise notice 'No accepted request found. Accept one in the app first, then run this again.';
    return;
  end if;

  select d.donor_id, d.title into v_donor, v_title
  from donations d where d.id = v_claim.donation_id;

  insert into claim_messages (claim_id, sender_id, body, created_at) values
    (v_claim.id, v_claim.claimant_id, 'Hi! Thanks for accepting my request for "' || v_title || '". 🙏', now() - interval '12 minutes'),
    (v_claim.id, v_donor,             'Welcome! It is packed and ready. Please come to the gate and call me when you arrive.', now() - interval '10 minutes'),
    (v_claim.id, v_claim.claimant_id, 'Great, I am leaving now. Should be there in about 15 minutes.', now() - interval '8 minutes'),
    (v_claim.id, v_donor,             'Perfect, see you soon 👍', now() - interval '7 minutes');

  raise notice 'Added 4 demo messages to claim %', v_claim.id;
end;
$$;

-- ------------------------------------------------------------
-- OPTIONAL: if some of your TEST accounts have no phone saved, you can
-- give them a placeholder so the Call button shows up. Uncomment, edit
-- the email, and run. Do NOT do this for real users.
-- ------------------------------------------------------------
-- update profile_private
--    set phone = '+919999999999'
--  where profile_id = (select id from auth.users where email = 'test@example.com')
--    and phone is null;
