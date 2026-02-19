# Invite Flow – Dev Test Note

## Quick test (no DB)

1. Run dev: `npm run dev`
2. Visit **`/invite/testtoken`**
3. In development, this uses a mock invite:
   - Role: Single
   - Invitor: Alex
   - Prefill: name "Jordan", email "jordan@example.com", community "north-county-san-diego"
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
