-- get_pond_candidates: RPC for Pond filtering by selected_single's community + mutual open_to.
-- Used by /api/profiles/pond. Filters: same orbit_community_slug, mutual open_to compatibility, exclude self.
-- SECURITY DEFINER: App uses service role; function reads profiles. RLS not bypassed for writes.
-- Assumes sex in ('Male','Female') and open_to in ('men','women','both') per schema.

CREATE OR REPLACE FUNCTION public.get_pond_candidates(
  selected_single_id uuid,
  page integer DEFAULT 1,
  "limit" integer DEFAULT 20,
  city text DEFAULT NULL,
  state text DEFAULT NULL,
  zip text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  birth_date date,
  birth_year integer,
  occupation text,
  sponsored_by_id uuid,
  matchmakr_endorsement text,
  pairings_signal jsonb,
  introduction_signal jsonb,
  photos text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH selected AS (
    SELECT
      p.orbit_community_slug,
      p.sex AS sel_sex,
      p.open_to AS sel_open_to
    FROM profiles p
    WHERE p.id = selected_single_id
      AND p.user_type = 'SINGLE'
    LIMIT 1
  )
  SELECT
    c.id,
    c.name,
    c.birth_date,
    c.birth_year,
    c.occupation,
    c.sponsored_by_id,
    c.matchmakr_endorsement,
    c.pairings_signal,
    c.introduction_signal,
    c.photos
  FROM profiles c
  CROSS JOIN selected s
  WHERE c.user_type = 'SINGLE'
    AND c.sponsored_by_id IS NOT NULL
    AND c.id != selected_single_id
    -- Same community (both must have non-null matching slug)
    AND s.orbit_community_slug IS NOT NULL
    AND c.orbit_community_slug = s.orbit_community_slug
    -- Candidate accepts selected_single (candidate.open_to includes selected's sex)
    AND (
      c.open_to = 'both'
      OR (c.open_to = 'men' AND LOWER(TRIM(COALESCE(s.sel_sex, ''))) = 'male')
      OR (c.open_to = 'women' AND LOWER(TRIM(COALESCE(s.sel_sex, ''))) = 'female')
    )
    -- Selected_single accepts candidate (selected.open_to includes candidate's sex)
    AND (
      s.sel_open_to = 'both'
      OR (s.sel_open_to = 'men' AND LOWER(TRIM(COALESCE(c.sex, ''))) = 'male')
      OR (s.sel_open_to = 'women' AND LOWER(TRIM(COALESCE(c.sex, ''))) = 'female')
    )
    -- Optional location filters (same semantics as API: ilike partial match)
    AND (city IS NULL OR TRIM(city) = '' OR c.city ILIKE '%' || TRIM(city) || '%')
    AND (state IS NULL OR TRIM(state) = '' OR c.state ILIKE '%' || TRIM(state) || '%')
    AND (zip IS NULL OR TRIM(zip) = '' OR c.zip_code ILIKE '%' || TRIM(zip) || '%')
  ORDER BY c.created_at DESC, c.id DESC
  LIMIT get_pond_candidates."limit"
  OFFSET (GREATEST(1, page) - 1) * get_pond_candidates."limit";
$$;

COMMENT ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text) IS
  'Returns Pond candidates filtered by selected_single: same community, mutual open_to, exclude self.';

-- Index to support community + user_type + sponsored + ordering
CREATE INDEX IF NOT EXISTS idx_profiles_pond_candidates
  ON public.profiles (orbit_community_slug, user_type, sponsored_by_id)
  WHERE user_type = 'SINGLE' AND sponsored_by_id IS NOT NULL;

GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text) TO service_role;
