-- Migration: Freeze Vendor V1 via feature flag
-- Eliminates unintended side effects: vendor_profiles auto-creation on auth.users INSERT
-- Trigger remains attached; function exits early when flag is false.
-- Reversible via: SELECT public.set_feature_flag('enable_vendor_v1', true);

-- 1. Create feature_flags table (idempotent)
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key text PRIMARY KEY,
    enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

-- 2. Insert/ensure enable_vendor_v1 = false
INSERT INTO public.feature_flags (key, enabled, updated_at)
VALUES ('enable_vendor_v1', false, now())
ON CONFLICT (key) DO UPDATE SET enabled = false, updated_at = now();

-- 3. Helper for reversibility
CREATE OR REPLACE FUNCTION public.set_feature_flag(p_key text, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.feature_flags (key, enabled, updated_at)
    VALUES (p_key, p_enabled, now())
    ON CONFLICT (key) DO UPDATE SET enabled = p_enabled, updated_at = now();
END;
$$;

-- 4. Rewrite handle_new_vendor to be flag-guarded
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS trigger AS $$
-- VENDOR V1 FROZEN (2026-02-15)
-- Tables relocated to legacy schema
-- Auto-creation guarded by feature flag enable_vendor_v1
BEGIN
    -- Exit early if Vendor V1 is frozen (default)
    IF NOT COALESCE(
        (SELECT enabled FROM public.feature_flags WHERE key = 'enable_vendor_v1' LIMIT 1),
        false
    ) THEN
        RETURN new;
    END IF;

    -- Only handle VENDOR users when flag is enabled
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

COMMENT ON FUNCTION public.handle_new_vendor() IS 'Trigger function for VENDOR users - creates vendor_profiles entries when enable_vendor_v1 flag is true. Frozen by default.';

-- Verify
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'enable_vendor_v1' AND enabled = false) THEN
        RAISE EXCEPTION 'Feature flag enable_vendor_v1 was not set to false';
    END IF;
    RAISE NOTICE 'SUCCESS: Vendor V1 frozen via feature flag. No vendor_profiles will be auto-created.';
    RAISE NOTICE 'Re-enable with: SELECT public.set_feature_flag(''enable_vendor_v1'', true);';
END $$;
