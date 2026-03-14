-- Refactor Pond retrieval/ranking to many-to-many communities overlap.
-- Replaces legacy orbit_community_slug hard gating with overlap-based scoring.
-- Keeps hard eligibility gates only: SINGLE, sponsored, not self, mutual sex/open_to.
-- Adds SQL-side interest_match_score so ranking happens before pagination.
-- Adds optional community_ids OR-filter plumbing (backend only; UI can adopt later).

DROP FUNCTION IF EXISTS public.get_pond_candidates(uuid, integer, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.get_pond_candidates(
  selected_single_id uuid,
  page integer DEFAULT 1,
  "limit" integer DEFAULT 20,
  city text DEFAULT NULL,
  state text DEFAULT NULL,
  zip text DEFAULT NULL,
  selected_interest_ids integer[] DEFAULT NULL,
  community_ids uuid[] DEFAULT NULL
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
  photos text[],
  shared_community_count integer,
  interest_match_score integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH selected AS (
    SELECT
      p.sex AS sel_sex,
      p.open_to AS sel_open_to
    FROM public.profiles p
    WHERE p.id = selected_single_id
      AND p.user_type = 'SINGLE'
    LIMIT 1
  ),
  selected_communities AS (
    SELECT cm.community_id
    FROM public.community_members cm
    WHERE cm.profile_id = selected_single_id
  ),
  candidate_base AS (
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
      c.photos,
      c.created_at
    FROM public.profiles c
    CROSS JOIN selected s
    WHERE c.user_type = 'SINGLE'
      AND c.sponsored_by_id IS NOT NULL
      AND c.id != selected_single_id
      -- Candidate accepts selected single.
      AND (
        c.open_to = 'both'
        OR (c.open_to = 'men' AND LOWER(TRIM(COALESCE(s.sel_sex, ''))) = 'male')
        OR (c.open_to = 'women' AND LOWER(TRIM(COALESCE(s.sel_sex, ''))) = 'female')
      )
      -- Selected single accepts candidate.
      AND (
        s.sel_open_to = 'both'
        OR (s.sel_open_to = 'men' AND LOWER(TRIM(COALESCE(c.sex, ''))) = 'male')
        OR (s.sel_open_to = 'women' AND LOWER(TRIM(COALESCE(c.sex, ''))) = 'female')
      )
      -- Optional location filters.
      AND (city IS NULL OR TRIM(city) = '' OR c.city ILIKE '%' || TRIM(city) || '%')
      AND (state IS NULL OR TRIM(state) = '' OR c.state ILIKE '%' || TRIM(state) || '%')
      AND (zip IS NULL OR TRIM(zip) = '' OR c.zip_code ILIKE '%' || TRIM(zip) || '%')
      -- Optional OR-style community filter plumbing for future UI.
      AND (
        community_ids IS NULL
        OR COALESCE(array_length(community_ids, 1), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM public.community_members cm_filter
          WHERE cm_filter.profile_id = c.id
            AND cm_filter.community_id = ANY(community_ids)
        )
      )
  )
  SELECT
    cb.id,
    cb.name,
    cb.birth_date,
    cb.birth_year,
    cb.occupation,
    cb.sponsored_by_id,
    cb.matchmakr_endorsement,
    cb.pairings_signal,
    cb.introduction_signal,
    cb.photos,
    COALESCE(shared.shared_community_count, 0)::integer AS shared_community_count,
    COALESCE(interests.interest_match_score, 0)::integer AS interest_match_score
  FROM candidate_base cb
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS shared_community_count
    FROM public.community_members cm
    JOIN selected_communities sc ON sc.community_id = cm.community_id
    WHERE cm.profile_id = cb.id
  ) shared ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN selected_interest_ids IS NULL OR COALESCE(array_length(selected_interest_ids, 1), 0) = 0 THEN 0
        ELSE COUNT(DISTINCT pi.interest_id)::integer
      END AS interest_match_score
    FROM public.profile_interests pi
    WHERE pi.profile_id = cb.id
      AND selected_interest_ids IS NOT NULL
      AND pi.interest_id = ANY(selected_interest_ids)
  ) interests ON TRUE
  ORDER BY
    COALESCE(shared.shared_community_count, 0) DESC,
    COALESCE(interests.interest_match_score, 0) DESC,
    cb.created_at DESC,
    cb.id DESC
  LIMIT get_pond_candidates."limit"
  OFFSET (GREATEST(1, page) - 1) * get_pond_candidates."limit";
$$;

COMMENT ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text, integer[], uuid[]) IS
  'Returns Pond candidates using hard eligibility + community overlap ranking + interest match score. Optional community_ids uses OR semantics.';

-- Keep grants aligned after signature change.
GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text, integer[], uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text, integer[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pond_candidates(uuid, integer, integer, text, text, text, integer[], uuid[]) TO service_role;

-- Supporting index for profile-first community membership lookups in overlap/filter checks.
CREATE INDEX IF NOT EXISTS idx_community_members_profile_id_community_id
  ON public.community_members (profile_id, community_id);
