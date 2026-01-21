-- Migration: Add paused_at column to profiles table
-- Allows singles to pause their introduction activity

-- Add paused_at column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN profiles.paused_at IS 'When single paused their activity. NULL = active.';

