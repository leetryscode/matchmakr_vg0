-- Migration: Phase 1 Communities System - Database Foundation
-- Creates communities and community_members tables for the new Orbit Communities system.
-- Additive only. Does NOT modify profiles.orbit_community_slug, get_pond_candidates, or handle_new_user.
--
-- Reference: docs/orbit-communities-system.md, .cursor/plans/communities_phase_1_db_foundation

-- ---------------------------------------------------------------------------
-- 1) Create communities table
-- ---------------------------------------------------------------------------
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  created_by uuid NOT NULL,
  join_mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communities_join_mode_check CHECK (join_mode IN ('open', 'sponsor_invite_only')),
  CONSTRAINT communities_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.communities IS 'Orbit communities. Context layers for trust and discovery; not social groups.';
COMMENT ON COLUMN public.communities.name IS 'Community name. Uniqueness deferred per spec.';
COMMENT ON COLUMN public.communities.description IS 'Optional community description.';
COMMENT ON COLUMN public.communities.created_by IS 'Founding sponsor. Must reference profile with user_type = MATCHMAKR. Immutable in Phase 1 (cannot be changed after insert). Blocks profile deletion while referenced (ON DELETE RESTRICT).';
COMMENT ON COLUMN public.communities.join_mode IS 'open: anyone can join. sponsor_invite_only: must be invited by a sponsor who is already a member.';

-- ---------------------------------------------------------------------------
-- 2) Create community_members table
-- ---------------------------------------------------------------------------
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  role text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_members_role_check CHECK (role IN ('founder', 'member')),
  CONSTRAINT community_members_community_id_profile_id_key UNIQUE (community_id, profile_id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id)
    REFERENCES public.communities(id) ON DELETE CASCADE,
  CONSTRAINT community_members_profile_id_fkey FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.community_members IS 'Join table: profiles belong to communities. One membership per profile per community.';
COMMENT ON COLUMN public.community_members.role IS 'founder: founding sponsor. member: joined later.';
COMMENT ON COLUMN public.community_members.community_id IS 'Cascades on community delete.';
COMMENT ON COLUMN public.community_members.profile_id IS 'Cascades on profile delete.';

-- ---------------------------------------------------------------------------
-- 3) Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_community_members_profile_id
  ON public.community_members (profile_id);

CREATE INDEX idx_community_members_community_id
  ON public.community_members (community_id);

-- ---------------------------------------------------------------------------
-- 4) Trigger: Validate created_by is MATCHMAKR (sponsor) and immutable
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_communities_created_by_sponsor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type public.user_role;
BEGIN
  -- On UPDATE: reject any change to created_by (immutable in Phase 1)
  IF TG_OP = 'UPDATE' AND OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'communities.created_by is immutable and cannot be changed after insert'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Validate created_by references a MATCHMAKR profile
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = NEW.created_by;

  IF v_user_type IS NULL THEN
    RAISE EXCEPTION 'communities.created_by must reference an existing profile'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_user_type != 'MATCHMAKR' THEN
    RAISE EXCEPTION 'communities.created_by must reference a sponsor (MATCHMAKR). Profile % has user_type %.',
      NEW.created_by, v_user_type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_communities_created_by_sponsor() IS
  'BEFORE INSERT OR UPDATE: ensures created_by references a MATCHMAKR profile and rejects any UPDATE that changes created_by (immutable).';

CREATE TRIGGER communities_validate_created_by_sponsor
  BEFORE INSERT OR UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_communities_created_by_sponsor();

-- ---------------------------------------------------------------------------
-- 5) Trigger: Ensure founder has community_members row
-- Uses ON CONFLICT DO NOTHING so manual founder insert does not cause errors.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_community_founder_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, profile_id, role)
  VALUES (NEW.id, NEW.created_by, 'founder')
  ON CONFLICT (community_id, profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_community_founder_membership() IS
  'AFTER INSERT: inserts founder row into community_members. Uses ON CONFLICT DO NOTHING for idempotency.';

CREATE TRIGGER communities_ensure_founder_membership
  AFTER INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_community_founder_membership();

-- ---------------------------------------------------------------------------
-- 6) Enable RLS (no policies; service_role bypasses)
-- ---------------------------------------------------------------------------
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
