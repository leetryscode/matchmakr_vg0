-- Migration: Add sponsor_label column to profiles table
-- Stores sponsor-provided label used before single sets their own name

-- Add sponsor_label column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sponsor_label TEXT NULL;

COMMENT ON COLUMN profiles.sponsor_label IS 'Sponsor-provided label used before the single sets their own name. Only visible to sponsor.';

