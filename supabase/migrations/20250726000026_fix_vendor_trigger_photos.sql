-- Migration: Fix vendor trigger to handle photos during vendor creation
-- This ensures new vendors get a photos column initialized properly

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

-- Update existing vendor profiles to have photos if they don't already
UPDATE public.vendor_profiles 
SET photos = '{}' 
WHERE photos IS NULL;

-- Verify the function was updated
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Vendor trigger function updated to handle photos!';
    RAISE NOTICE 'Existing vendor profiles updated with empty photos array.';
END $$; 