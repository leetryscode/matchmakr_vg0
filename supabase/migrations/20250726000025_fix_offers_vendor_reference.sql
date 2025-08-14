-- Migration: Fix offers table foreign key to reference vendor_profiles instead of profiles
-- This aligns the offers table with our new vendor architecture

-- First, drop the existing foreign key constraint
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_vendor_id_fkey;

-- Add the new foreign key constraint referencing vendor_profiles
ALTER TABLE public.offers 
ADD CONSTRAINT offers_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES public.vendor_profiles(id) ON DELETE CASCADE;

-- Update the RLS policies to work with vendor_profiles
-- Drop existing policies
DROP POLICY IF EXISTS "Vendors can view own offers" ON public.offers;
DROP POLICY IF EXISTS "Vendors can insert own offers" ON public.offers;
DROP POLICY IF EXISTS "Vendors can update own offers" ON public.offers;
DROP POLICY IF EXISTS "Vendors can delete own offers" ON public.offers;

-- Recreate policies to work with vendor_profiles table
CREATE POLICY "Vendors can view own offers" ON public.offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vendor_profiles 
            WHERE vendor_profiles.id = offers.vendor_id 
            AND vendor_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Vendors can insert own offers" ON public.offers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vendor_profiles 
            WHERE vendor_profiles.id = offers.vendor_id 
            AND vendor_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Vendors can update own offers" ON public.offers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.vendor_profiles 
            WHERE vendor_profiles.id = offers.vendor_id 
            AND vendor_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Vendors can delete own offers" ON public.offers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.vendor_profiles 
            WHERE vendor_profiles.id = offers.vendor_id 
            AND vendor_profiles.id = auth.uid()
        )
    );

-- Verify the foreign key was updated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'offers' 
        AND constraint_name = 'offers_vendor_id_fkey'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint was not updated successfully';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Offers table now references vendor_profiles correctly!';
    RAISE NOTICE 'RLS policies updated to work with vendor_profiles table.';
END $$; 