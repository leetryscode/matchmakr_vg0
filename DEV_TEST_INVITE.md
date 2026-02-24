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

## Sponsor → Single invite (JOIN + CONNECT)

### Deploy

1. Deploy edge function: `supabase functions deploy sponsor-single`
2. Set secrets:
   ```bash
   supabase secrets set RESEND_TEMPLATE_SPONSOR_TO_SINGLE=<template-id>        # JOIN (new user)
   supabase secrets set RESEND_TEMPLATE_SPONSOR_TO_SINGLE_CONNECT=<template-id>  # CONNECT (existing user)
   ```
   (Also requires: RESEND_API_KEY, RESEND_FROM, SITE_URL)

### End-to-end test – CONNECT (single exists)

1. Sign in as a **Sponsor** (MatchMakr)
2. Go to Managed Singles / invite flow
3. Enter email of an **existing** Single
4. Click **Send invite**
5. Confirm toast: "Invite sent!"
6. Check single inbox for CONNECT email (link to `/login?redirect=/dashboard/single`)
7. Click link → login (if needed) → redirect to single dashboard with sponsorship request

### End-to-end test – JOIN (single does not exist)

1. Sign in as a **Sponsor**
2. Enter email of someone who is **not** an Orbit user
3. Click **Send invite**
4. Check invitee inbox for JOIN email with `/invite/:token` link
5. Click link → InviteGate → onboarding → signup as Single

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

---

## Single → Sponsor invite (CONNECT + JOIN)

### Deploy

1. Deploy edge function: `supabase functions deploy sponsor-user`
2. Set secrets for CONNECT email:
   ```bash
   supabase secrets set RESEND_TEMPLATE_SINGLE_TO_SPONSOR_CONNECT=<template-id>
   ```
   (JOIN reuses RESEND_TEMPLATE_SPONSOR_TO_SPONSOR. Also requires: RESEND_API_KEY, RESEND_FROM, SITE_URL)

### End-to-end test – CONNECT (sponsor exists)

1. Sign in as a **Single**
2. Click **Invite a sponsor** (or equivalent)
3. Enter email of an **existing** MatchMakr
4. Click **Send Invite**
5. Confirm toast: "Request sent"
6. Check sponsor inbox for CONNECT email (link to /dashboard)

### End-to-end test – JOIN (sponsor does not exist)

1. Sign in as a **Single**
2. Click **Invite a sponsor**
3. Enter email of someone who is **not** a MatchMakr
4. Click **Send Invite**
5. Confirm toast: "Invite sent"
6. Check invitee inbox for JOIN email with invite link
7. Click link → lands on `/invite/:token`
8. InviteGate shows Sponsor copy
9. Click **Continue** → onboarding, role locked to Sponsor
10. Complete signup as Sponsor (MATCHMAKR)

---

## Single → Single invite (referral)

No DB writes; always sends email. CTA links to app root (`SITE_URL/`) where invitee can "Get started" or "Log in".

### Deploy

1. Deploy edge function: `supabase functions deploy single-single`
2. Set secrets:
   ```bash
   supabase secrets set RESEND_TEMPLATE_SINGLE_TO_SINGLE=<template-id>
   ```
   (Also requires: RESEND_API_KEY, RESEND_FROM, SITE_URL)

### End-to-end test

1. Sign in as a **Single**
2. Go to Single dashboard → "Introduced by my sponsor" section
3. Click **"Help grow Orbit"** row (below Preview or chat list)
4. Enter invitee email + optional name
5. Click **Send Invite**
6. Confirm toast: "Invite sent."
7. Check invitee inbox for Resend email with link to app root
8. Click link → lands on `/` (entry page: Get started / Log in)

---

### Verify sponsorship_request + notification (JOIN signup)

After the sponsor signs up via Single→Sponsor JOIN invite:

1. Run migration: `supabase db push` (includes `20260218100000_handle_new_user_matchmakr_invite_claim`)
2. In DB: verify `sponsorship_requests` has a row with `sponsor_id` = new sponsor, `single_id` = inviter, `status` = `PENDING_SPONSOR_APPROVAL`, `invite_id` set
3. In DB: verify `invites` row has `status` = `CLAIMED`, `invitee_user_id` = new sponsor
4. Sign in as the **new Sponsor** → dashboard should show "Sponsorship requests" with "{Single name} wants you to be their sponsor"
5. Sponsor can Accept or Decline
