-- Migration: Revert to the original working trigger function
-- This reverts to the simple trigger that was working for SINGLE and SPONSOR users
-- before we started adding VENDOR support

-- Drop the current trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the ORIGINAL working trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    user_type,
    name,
    sex,
    birth_year,
    occupation
  )
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'user_type')::user_role,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex',
    (new.raw_user_meta_data->>'birth_year')::integer,
    new.raw_user_meta_data->>'occupation'
  );
  RETURN new;
END;
$$;

-- Recreate the original trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a comment to document this is the reverted working version
COMMENT ON FUNCTION public.handle_new_user() IS 'REVERTED: Original working trigger function for SINGLE and SPONSOR users';

-- Test that the function works
DO $$
BEGIN
    -- Verify the trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created was not created successfully';
    END IF;
    
    -- Verify the function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'Function handle_new_user was not created successfully';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Reverted to original working trigger function!';
    RAISE NOTICE 'SINGLE and SPONSOR users should now be able to onboard successfully.';
END $$; 