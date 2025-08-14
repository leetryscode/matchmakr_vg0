-- Migration: Add photos column to vendor_profiles table
-- This enables vendors to upload and manage photos like other user types

-- Add photos column to vendor_profiles table
ALTER TABLE public.vendor_profiles 
ADD COLUMN photos text[] DEFAULT '{}';

-- Update the vendor trigger function to handle photos
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS trigger AS $$
BEGIN
    -- Only handle VENDOR users
    IF (new.raw_user_meta_data->>'user_type')::public.user_role = 'VENDOR' THEN
        INSERT INTO public.vendor_profiles (
            id,
            business_name,
            industry,
            street_address,
            city,
            state,
            zip_code,
            photos,
            created_at
        )
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'business_name', 'Vendor'),
            COALESCE(new.raw_user_meta_data->>'industry', 'General'),
            COALESCE(new.raw_user_meta_data->>'street_address', ''),
            COALESCE(new.raw_user_meta_data->>'city', ''),
            COALESCE(new.raw_user_meta_data->>'state', ''),
            COALESCE(new.raw_user_meta_data->>'zip_code', ''),
            COALESCE((new.raw_user_meta_data->>'photos')::text[], '{}'),
            now()
        );
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the TypeScript types to include photos
-- Note: This will need to be updated in src/components/profile/types.ts

-- Test that the photos column was added successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'photos'
    ) THEN
        RAISE EXCEPTION 'Photos column was not added to vendor_profiles table';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Photos column added to vendor_profiles table!';
    RAISE NOTICE 'VENDOR users can now upload and manage photos.';
    RAISE NOTICE 'Existing vendor profiles will have an empty photos array by default.';
END $$; 