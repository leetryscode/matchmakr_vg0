-- Migration: Create sneak_peeks table for sponsor-led introduction previews
-- This feature allows sponsors to send low-commitment previews to their singles
-- Singles respond with signals (open to it, not sure yet, dismiss) - no automatic actions

-- Create status enum type
CREATE TYPE public.sneak_peek_status AS ENUM (
    'PENDING',
    'OPEN_TO_IT',
    'NOT_SURE_YET',
    'DISMISSED',
    'EXPIRED'
);

-- Create sneak_peeks table
CREATE TABLE IF NOT EXISTS public.sneak_peeks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_single_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_single_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    photo_url text NOT NULL, -- Snapshot of first profile photo at creation time
    status public.sneak_peek_status DEFAULT 'PENDING' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL, -- created_at + 48 hours
    responded_at timestamp with time zone
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sneak_peeks_recipient ON public.sneak_peeks(recipient_single_id);
CREATE INDEX IF NOT EXISTS idx_sneak_peeks_sponsor ON public.sneak_peeks(from_sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sneak_peeks_status_expires ON public.sneak_peeks(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sneak_peeks_target ON public.sneak_peeks(target_single_id);

-- Enable RLS
ALTER TABLE public.sneak_peeks ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own sneak peeks
CREATE POLICY "Recipients can read own sneak peeks" ON public.sneak_peeks
    FOR SELECT USING (auth.uid() = recipient_single_id);

-- Recipients can update status and responded_at on their own sneak peeks
-- WITH CHECK ensures only status and responded_at can be updated (not other fields)
CREATE POLICY "Recipients can update own sneak peeks" ON public.sneak_peeks
    FOR UPDATE 
    USING (auth.uid() = recipient_single_id)
    WITH CHECK (
        auth.uid() = recipient_single_id
        AND OLD.from_sponsor_id = NEW.from_sponsor_id
        AND OLD.recipient_single_id = NEW.recipient_single_id
        AND OLD.target_single_id = NEW.target_single_id
        AND OLD.photo_url = NEW.photo_url
        AND OLD.expires_at = NEW.expires_at
        AND OLD.created_at = NEW.created_at
    );

-- Sponsors can read sneak peeks they sent
CREATE POLICY "Sponsors can read own sent sneak peeks" ON public.sneak_peeks
    FOR SELECT USING (auth.uid() = from_sponsor_id);

-- Sponsors can insert sneak peeks (validation happens in API routes)
CREATE POLICY "Sponsors can insert sneak peeks" ON public.sneak_peeks
    FOR INSERT WITH CHECK (auth.uid() = from_sponsor_id);

-- Note: Additional validation (user type check, active count limit) happens in API routes

-- Create trigger to automatically set expires_at (created_at + 48 hours)
-- This ensures server-side timestamp consistency
CREATE OR REPLACE FUNCTION public.set_sneak_peek_expiry()
RETURNS trigger AS $$
BEGIN
    -- Set expires_at to created_at + 48 hours
    -- If created_at is not set yet, use now()
    IF NEW.created_at IS NULL THEN
        NEW.created_at = now();
    END IF;
    NEW.expires_at = NEW.created_at + interval '48 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sneak_peek_expiry
    BEFORE INSERT ON public.sneak_peeks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sneak_peek_expiry();

-- Add comments for documentation
COMMENT ON TABLE public.sneak_peeks IS 'Sponsor-led introduction previews sent to singles. Singles respond with low-commitment signals (open to it, not sure yet, dismiss). No automatic actions occur.';
COMMENT ON COLUMN public.sneak_peeks.photo_url IS 'Snapshot of target single''s first profile photo at creation time. Preserves preview even if target changes photos later. If using signed/expiring URLs, consider storing storage path and generating signed URLs at read time.';
COMMENT ON COLUMN public.sneak_peeks.status IS 'Current status: PENDING (awaiting response), OPEN_TO_IT, NOT_SURE_YET, DISMISSED, or EXPIRED (for future use). Only OPEN_TO_IT, NOT_SURE_YET, and DISMISSED can be set via PATCH.';
COMMENT ON COLUMN public.sneak_peeks.expires_at IS 'Expiration timestamp (created_at + 48 hours, set by trigger). Expired sneak peeks are filtered at query time using DB now().';
COMMENT ON COLUMN public.sneak_peeks.responded_at IS 'Timestamp when single responded. Null if still pending.';

