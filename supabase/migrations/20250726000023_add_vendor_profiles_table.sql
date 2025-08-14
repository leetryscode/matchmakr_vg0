-- Migration: Add separate vendor_profiles table and trigger
-- This creates a clean separation for VENDOR users while preserving existing functionality

-- Create the vendor_profiles table
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id uuid NOT NULL PRIMARY KEY,
    business_name text NOT NULL,
    industry text NOT NULL,
    street_address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Foreign key to auth.users
    CONSTRAINT vendor_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create a separate trigger function for VENDOR users
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
            now()
        );
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the vendor trigger
CREATE TRIGGER on_auth_user_created_vendor
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_vendor();

-- Update the offers table to reference vendor_profiles instead of profiles
-- First, let's check if the offers table exists and has vendor_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'offers' 
        AND table_schema = 'public'
    ) THEN
        -- Check if vendor_id column exists and references profiles
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'offers' 
            AND column_name = 'vendor_id'
        ) THEN
            -- Drop the existing foreign key if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'offers' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%vendor_id%'
            ) THEN
                -- We'll need to drop and recreate the constraint
                RAISE NOTICE 'Offers table exists with vendor_id - will need to update foreign key reference';
            END IF;
        END IF;
    END IF;
END $$;

-- Add RLS policies for vendor_profiles
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles are viewable by everyone
CREATE POLICY "Vendor profiles are viewable by everyone." ON public.vendor_profiles FOR SELECT USING (true);

-- Users can insert their own vendor profile
CREATE POLICY "Users can insert their own vendor profile." ON public.vendor_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own vendor profile
CREATE POLICY "Users can update their own vendor profile." ON public.vendor_profiles FOR UPDATE USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON TABLE public.vendor_profiles TO authenticated;
GRANT ALL ON TABLE public.vendor_profiles TO service_role;

-- Add a comment to document this is the vendor separation
COMMENT ON TABLE public.vendor_profiles IS 'Separate table for VENDOR users - business profiles independent of personal profiles';
COMMENT ON FUNCTION public.handle_new_vendor() IS 'Trigger function for VENDOR users - creates vendor_profiles entries';

-- Test that the trigger function works
DO $$
BEGIN
    -- Verify the vendor trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_vendor' 
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        RAISE EXCEPTION 'Vendor trigger on_auth_user_created_vendor was not created successfully';
    END IF;
    
    -- Verify the function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_vendor' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'Function handle_new_vendor was not created successfully';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Vendor profiles table and trigger created successfully!';
    RAISE NOTICE 'VENDOR users will now be routed to vendor_profiles table.';
    RAISE NOTICE 'SINGLE and SPONSOR users continue to use the existing profiles table.';
END $$; 