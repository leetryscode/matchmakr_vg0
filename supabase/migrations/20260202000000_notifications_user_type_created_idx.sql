-- Index for fast cooldown checks on notifications (user_id, type, created_at)
-- Used by nudge helpers and other notification logic that filters by type and recency
CREATE INDEX IF NOT EXISTS notifications_user_type_created_idx
ON public.notifications (user_id, type, created_at DESC);
