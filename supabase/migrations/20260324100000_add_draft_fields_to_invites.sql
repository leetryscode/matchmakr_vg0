-- Migration: Add sponsor-authored draft profile fields to invites table
-- When a sponsor invites a single, they can pre-build the single's profile
-- before the single signs up. These fields are copied to the profiles table
-- when the single accepts sponsorship (see accept_sponsorship_request RPC).
--
-- invitee_label (already exists) maps to profiles.name (display name)
-- draft_endorsement       → profiles.matchmakr_endorsement
-- draft_pairings_signal   → profiles.pairings_signal
-- draft_introduction_signal → profiles.introduction_signal
-- draft_photos            → profiles.photos

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS draft_endorsement           text          NULL,
  ADD COLUMN IF NOT EXISTS draft_pairings_signal       jsonb         NULL,
  ADD COLUMN IF NOT EXISTS draft_introduction_signal   jsonb         NULL,
  ADD COLUMN IF NOT EXISTS draft_photos                text[]        NULL;

COMMENT ON COLUMN public.invites.draft_endorsement IS
  'Sponsor''s endorsement text for the single. Copied to profiles.matchmakr_endorsement on sponsorship acceptance.';

COMMENT ON COLUMN public.invites.draft_pairings_signal IS
  'Compatibility signals authored by sponsor. Copied to profiles.pairings_signal on sponsorship acceptance. Shape: { quality_ids: string[] }';

COMMENT ON COLUMN public.invites.draft_introduction_signal IS
  'Intro prompt/response authored by sponsor. Copied to profiles.introduction_signal on sponsorship acceptance.';

COMMENT ON COLUMN public.invites.draft_photos IS
  'Array of photo URLs authored by sponsor. Copied to profiles.photos on sponsorship acceptance. Same text[] type as profiles.photos.';
