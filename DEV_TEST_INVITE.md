# Invite Flow – Dev Test Note

## Quick test (no DB)

1. Run dev: `npm run dev`
2. Visit **`/invite/testtoken`** (Single) or **`/invite/testsponsor`** (Sponsor)
3. In development, these use mock invites:
   - **testtoken**: Role Single, Invitor Alex, Prefill: Jordan, jordan@example.com, north-county-san-diego
   - **testsponsor**: Role Sponsor, same prefills
4. Click **Continue**
5. Confirm:
   - Role selection is skipped
   - Name step shows "Jordan" prefilled
   - Community step shows "North County San Diego" as recommended
   - Account creation step shows "jordan@example.com" prefilled

## Test "Choose different role"

1. Visit `/invite/testtoken`
2. Click **"Not what you expected? Choose a different role."**
3. Confirm you land on the normal role selection screen (Single / Sponsor / Vendor)
4. Invite mode should be cleared (no prefills if you go back)

## Test with real invite (requires DB)

1. Run migration: `supabase db push` (adds `token` column to invites)
2. Create an invite via sponsor dashboard (invites created after migration get a token)
3. Use the token from the DB or from the invite-single API response (when wired)
4. Visit `/invite/<token>`

---

## Sponsor → Sponsor invite (JOIN)

### Deploy

1. Deploy edge function: `supabase functions deploy sponsor-sponsor`
2. Set secrets:
   ```bash
   supabase secrets set RESEND_TEMPLATE_SPONSOR_TO_SPONSOR=65847af6-9347-4e6e-b384-f4a605c34e40
   ```
   (Also requires: RESEND_API_KEY, RESEND_FROM, SITE_URL — same as sponsor-single)

### End-to-end test

1. Sign in as a **Sponsor** (MatchMakr)
2. Go to Sponsor chat section (matchmakr dashboard)
3. Click **"Invite another sponsor"** or **"Invite a fellow sponsor"**
4. Enter email + optional name (e.g. "Jordan")
5. Click **Send invite**
6. Confirm toast: "Invite sent to {email}"
7. Check invitee inbox for Resend email with invite link
8. Click link → lands on `/invite/:token`
9. InviteGate shows Sponsor copy: "You were invited to Orbit as a Sponsor"
10. Click **Continue** → onboarding skips role selection, role locked to Sponsor
11. Confirm name/email/community prefilled
