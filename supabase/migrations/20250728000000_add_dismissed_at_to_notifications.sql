-- Migration: Add dismissed_at column to notifications table
-- This replaces the temporary read=true dismissal logic with a proper dismissed_at timestamp

-- Add dismissed_at column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- Add index for fast queries on active notifications (dismissed_at IS NULL)
CREATE INDEX IF NOT EXISTS notifications_user_active_created_idx
ON public.notifications (user_id, created_at DESC)
WHERE dismissed_at IS NULL;

