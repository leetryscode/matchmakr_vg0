-- Migration: Create claimed_offers table for tracking offer claims
CREATE TABLE IF NOT EXISTS public.claimed_offers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    redeemed_at timestamp with time zone,
    
    -- Ensure a user can only claim an offer once
    UNIQUE(offer_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claimed_offers_offer_id ON public.claimed_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_claimed_offers_user_id ON public.claimed_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_offers_claimed_at ON public.claimed_offers(claimed_at);

-- Add RLS policies
ALTER TABLE public.claimed_offers ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view own claims" ON public.claimed_offers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own claims
CREATE POLICY "Users can insert own claims" ON public.claimed_offers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own claims (for redemption)
CREATE POLICY "Users can update own claims" ON public.claimed_offers
    FOR UPDATE USING (auth.uid() = user_id);

-- Vendors can view claims on their offers
CREATE POLICY "Vendors can view claims on their offers" ON public.claimed_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.offers 
            WHERE offers.id = claimed_offers.offer_id 
            AND offers.vendor_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE public.claimed_offers IS 'Tracks which users have claimed which offers';
COMMENT ON COLUMN public.claimed_offers.redeemed_at IS 'When the offer was redeemed (null if not yet redeemed)'; 