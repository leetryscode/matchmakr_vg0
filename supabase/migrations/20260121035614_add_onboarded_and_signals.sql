-- Migration: Add onboarded_at and signal columns to profiles table
-- Adds onboarding tracking and JSONB fields for introduction/pairings signals

-- Add onboarded_at column for tracking when singles complete onboarding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN profiles.onboarded_at IS 'When single completed onboarding/profile building. NULL = invited but not onboarded.';

-- Add introduction_signal JSONB column (already exists in DB via manual edits, adding to migrations)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS introduction_signal JSONB NULL;

COMMENT ON COLUMN profiles.introduction_signal IS 'JSONB: { prompt_id: string, prompt_text: string, response: string } - Sponsor-authored introduction signal for single profile.';

-- Add pairings_signal JSONB column (already exists in DB via manual edits, adding to migrations)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pairings_signal JSONB NULL;

COMMENT ON COLUMN profiles.pairings_signal IS 'JSONB: { quality_ids: string[], custom_quality?: string | null } - Sponsor-authored pairings qualities describing who the single pairs well with.';

-- Backfill onboarded_at for existing SINGLE profiles conservatively
-- Only mark as onboarded if they have photos OR matchmakr_endorsement
UPDATE profiles
SET onboarded_at = COALESCE(created_at, NOW())
WHERE user_type = 'SINGLE'
  AND onboarded_at IS NULL
  AND (
    (photos IS NOT NULL AND array_length(photos, 1) > 0)
    OR (matchmakr_endorsement IS NOT NULL AND trim(matchmakr_endorsement) != '')
  );

