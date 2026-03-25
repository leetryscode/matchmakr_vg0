-- Migration: SECURITY DEFINER RPC for updating draft profile fields on an invite.
-- The invites table has no UPDATE policy for authenticated users (all mutations
-- go through service role or SECURITY DEFINER functions). This function is the
-- designated path for the sponsor-facing DraftProfileWalkthrough modal.
--
-- Ownership is enforced by the WHERE inviter_id = auth.uid() guard.
-- Only draft_* columns are touched; all other invite fields are left unchanged.
-- Each parameter defaults to NULL; passing NULL leaves the existing column value
-- untouched (via COALESCE), so callers can update a single field per step.

CREATE OR REPLACE FUNCTION public.save_invite_draft_fields(
  p_invite_id            uuid,
  p_draft_endorsement    text          DEFAULT NULL,
  p_draft_pairings       jsonb         DEFAULT NULL,
  p_draft_introduction   jsonb         DEFAULT NULL,
  p_draft_photos         text[]        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invites
  SET
    draft_endorsement          = COALESCE(p_draft_endorsement,  draft_endorsement),
    draft_pairings_signal      = COALESCE(p_draft_pairings,     draft_pairings_signal),
    draft_introduction_signal  = COALESCE(p_draft_introduction, draft_introduction_signal),
    draft_photos               = COALESCE(p_draft_photos,       draft_photos)
  WHERE id = p_invite_id
    AND inviter_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite not found or permission denied';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_invite_draft_fields FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_invite_draft_fields TO authenticated;
