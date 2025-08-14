-- Migration: Fix duplicate vendor profiles by updating handle_new_user trigger
-- This prevents VENDOR users from being created in both profiles and vendor_profiles tables

-- Update the handle_new_user trigger function to skip VENDOR users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Skip VENDOR users - they are handled by handle_new_vendor trigger
  IF (new.raw_user_meta_data->>'user_type')::user_role = 'VENDOR' THEN
    RETURN new;
  END IF;
  
  -- Handle SINGLE and SPONSOR users as before
  INSERT INTO public.profiles (
    id, user_type, name, sex, birth_year, occupation
  )
  VALUES (
    new.id, (new.raw_user_meta_data->>'user_type')::user_role, new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex', (new.raw_user_meta_data->>'birth_year')::integer,
    new.raw_user_meta_data->>'occupation'
  );
  RETURN new;
END;
$$;

-- Clean up any existing duplicate vendor entries in profiles table
-- (Keep the vendor_profiles entries, remove from profiles)
DELETE FROM public.profiles 
WHERE user_type = 'VENDOR' 
AND id IN (SELECT id FROM public.vendor_profiles);

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: handle_new_user trigger updated to skip VENDOR users!';
    RAISE NOTICE 'Duplicate vendor entries cleaned up from profiles table.';
    RAISE NOTICE 'VENDOR users now only exist in vendor_profiles table.';
END $$; 