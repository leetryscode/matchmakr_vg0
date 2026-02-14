-- Chunk A: Add birth_date, open_to, orbit_community_slug to profiles.
-- Backfill birth_date from birth_year; update handle_new_user(); recreate profile_with_interests.
-- Vendor path and vendor_profiles unchanged.

-- ---------------------------------------------------------------------------
-- 1) Add columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
  ADD COLUMN IF NOT EXISTS open_to TEXT NULL,
  ADD COLUMN IF NOT EXISTS orbit_community_slug TEXT NULL;

COMMENT ON COLUMN public.profiles.birth_date IS 'Full date of birth; preferred over birth_year for age.';
COMMENT ON COLUMN public.profiles.open_to IS 'Open to being introduced to: men, women, or both.';
COMMENT ON COLUMN public.profiles.orbit_community_slug IS 'Orbit community: north-county-san-diego, boulder-colorado, or bring-orbit-waitlist.';
COMMENT ON COLUMN public.profiles.birth_year IS 'Deprecated in favor of birth_date. Kept for backward compatibility during transition.';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_open_to_check
  CHECK (open_to IS NULL OR open_to IN ('men', 'women', 'both'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_orbit_community_slug_check
  CHECK (orbit_community_slug IS NULL OR orbit_community_slug IN (
    'north-county-san-diego',
    'boulder-colorado',
    'bring-orbit-waitlist'
  ));

-- ---------------------------------------------------------------------------
-- 2) Backfill birth_date from birth_year (only where birth_date is NULL)
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET birth_date = ((birth_year::text) || '-01-01')::date
WHERE birth_year IS NOT NULL
  AND birth_date IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Update handle_new_user() — VENDOR branch unchanged; SINGLE/MATCHMAKR get new columns and safe casting
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_bd text;
  meta_by text;
  bd date;
  by integer;
  ot text;
  slug text;
BEGIN
  IF (new.raw_user_meta_data->>'user_type')::user_role = 'VENDOR' THEN
    RETURN new;
  END IF;

  meta_bd := NULLIF(TRIM(new.raw_user_meta_data->>'birth_date'), '');
  meta_by := NULLIF(TRIM(new.raw_user_meta_data->>'birth_year'), '');

  IF meta_bd IS NOT NULL THEN
    bd := meta_bd::date;
    by := EXTRACT(YEAR FROM bd)::integer;
  ELSIF meta_by IS NOT NULL THEN
    by := meta_by::integer;
    bd := (meta_by || '-01-01')::date;
  ELSE
    bd := NULL;
    by := NULL;
  END IF;

  ot := NULLIF(TRIM(new.raw_user_meta_data->>'open_to'), '');
  slug := NULLIF(TRIM(new.raw_user_meta_data->>'orbit_community_slug'), '');

  INSERT INTO public.profiles (
    id, user_type, name, sex, birth_year, birth_date, occupation,
    open_to, orbit_community_slug
  )
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'user_type')::user_role,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex',
    by,
    bd,
    new.raw_user_meta_data->>'occupation',
    ot,
    slug
  );
  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Recreate profile_with_interests with GROUP BY p.id only (stable for future columns)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.profile_with_interests;

CREATE VIEW public.profile_with_interests AS
SELECT
  p.*,
  ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) AS interest_names,
  ARRAY_AGG(DISTINCT i.id) FILTER (WHERE i.id IS NOT NULL) AS interest_ids
FROM public.profiles p
LEFT JOIN public.profile_interests pi ON p.id = pi.profile_id
LEFT JOIN public.interests i ON pi.interest_id = i.id
WHERE p.user_type = 'SINGLE' AND p.sponsored_by_id IS NOT NULL
GROUP BY p.id;
