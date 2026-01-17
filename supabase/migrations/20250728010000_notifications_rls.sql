-- Migration: Enable RLS on notifications table and add policies
-- Users can only SELECT and UPDATE their own notifications
-- INSERT and DELETE are not allowed via client (only via service role in API routes)

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (for dismissal)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Note: No INSERT or DELETE policies - these operations must be done via service role in API routes

