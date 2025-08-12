-- Migration: Create offers table for vendor date ideas and ads
CREATE TABLE IF NOT EXISTS public.offers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    duration_days integer NOT NULL DEFAULT 30,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    claim_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    photos text[] DEFAULT '{}' NOT NULL,
    
    -- Ensure photos array doesn't exceed 6 items
    CONSTRAINT offers_photos_limit CHECK (array_length(photos, 1) <= 6)
);

-- Create index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_offers_vendor_id ON public.offers(vendor_id);

-- Create index for active offers
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active) WHERE is_active = true;

-- Create index for expiration lookups
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);

-- Add RLS policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own offers
CREATE POLICY "Vendors can view own offers" ON public.offers
    FOR SELECT USING (auth.uid() = vendor_id);

-- Vendors can insert their own offers
CREATE POLICY "Vendors can insert own offers" ON public.offers
    FOR INSERT WITH CHECK (auth.uid() = vendor_id);

-- Vendors can update their own offers
CREATE POLICY "Vendors can update own offers" ON public.offers
    FOR UPDATE USING (auth.uid() = vendor_id);

-- Vendors can delete their own offers
CREATE POLICY "Vendors can delete own offers" ON public.offers
    FOR DELETE USING (auth.uid() = vendor_id);

-- All authenticated users can view active offers (for public display)
CREATE POLICY "Users can view active offers" ON public.offers
    FOR SELECT USING (is_active = true);

-- Create trigger to automatically set expires_at
CREATE OR REPLACE FUNCTION public.set_offer_expiry()
RETURNS trigger AS $$
BEGIN
    NEW.expires_at = NEW.created_at + (NEW.duration_days || ' days')::interval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_offer_expiry
    BEFORE INSERT OR UPDATE ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_offer_expiry();

-- Add comments
COMMENT ON TABLE public.offers IS 'Vendor offers/date ideas that users can claim';
COMMENT ON COLUMN public.offers.duration_days IS 'Number of days the offer is valid from creation';
COMMENT ON COLUMN public.offers.expires_at IS 'Auto-calculated expiration timestamp';
COMMENT ON COLUMN public.offers.claim_count IS 'Number of times this offer has been claimed';
COMMENT ON COLUMN public.offers.photos IS 'Array of photo URLs for the offer (max 6)'; 