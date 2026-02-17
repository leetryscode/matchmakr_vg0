-- Migration: Single→Sponsor symmetric approval
-- Adds PENDING_SPONSOR_APPROVAL status and sponsor-side accept/decline RPCs.
-- No breaking changes to existing statuses.

-- ---------------------------------------------------------------------------
-- A) sponsorship_requests.status: add PENDING_SPONSOR_APPROVAL
-- ---------------------------------------------------------------------------
ALTER TABLE public.sponsorship_requests DROP CONSTRAINT IF EXISTS sponsorship_requests_status_check;
ALTER TABLE public.sponsorship_requests ADD CONSTRAINT sponsorship_requests_status_check
  CHECK (status IN ('PENDING_SINGLE_APPROVAL', 'PENDING_SPONSOR_APPROVAL', 'ACCEPTED', 'DECLINED', 'CANCELLED'));

COMMENT ON COLUMN public.sponsorship_requests.status IS 'PENDING_SINGLE_APPROVAL (single must approve), PENDING_SPONSOR_APPROVAL (sponsor must approve), ACCEPTED, DECLINED, or CANCELLED.';

-- ---------------------------------------------------------------------------
-- B) accept_sponsorship_request_as_sponsor(p_request_id uuid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_sponsorship_request_as_sponsor(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, sponsor_id, single_id, invite_id, status
  INTO rec
  FROM public.sponsorship_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship request not found';
  END IF;

  IF rec.sponsor_id != caller_id THEN
    RAISE EXCEPTION 'Only the sponsor can accept this request';
  END IF;

  -- Idempotent: already ACCEPTED -> run cleanup, then return ok
  IF rec.status = 'ACCEPTED' THEN
    -- Cleanup: decline other pending requests for this single (PENDING_SPONSOR_APPROVAL)
    UPDATE public.sponsorship_requests
    SET status = 'DECLINED', updated_at = now()
    WHERE single_id = rec.single_id
      AND id != rec.id
      AND status = 'PENDING_SPONSOR_APPROVAL';

    UPDATE public.invites
    SET status = 'DECLINED', updated_at = now()
    WHERE id IN (
      SELECT invite_id FROM public.sponsorship_requests
      WHERE single_id = rec.single_id
        AND id != rec.id
        AND status = 'DECLINED'
        AND invite_id IS NOT NULL
    );

    RETURN jsonb_build_object(
      'ok', true,
      'request_id', rec.id,
      'single_id', rec.single_id,
      'sponsor_id', rec.sponsor_id,
      'status', rec.status
    );
  END IF;

  IF rec.status != 'PENDING_SPONSOR_APPROVAL' THEN
    RAISE EXCEPTION 'Request is not pending sponsor approval (status: %)', rec.status;
  END IF;

  -- Single already has a different sponsor
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = rec.single_id
      AND sponsored_by_id IS NOT NULL
      AND sponsored_by_id != rec.sponsor_id
  ) THEN
    RAISE EXCEPTION 'This single already has a sponsor.';
  END IF;

  -- a) Update sponsorship_requests
  UPDATE public.sponsorship_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = rec.id;

  -- b) Set profiles.sponsored_by_id
  UPDATE public.profiles
  SET sponsored_by_id = rec.sponsor_id
  WHERE id = rec.single_id;

  -- c) Update linked invite
  IF rec.invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'ACCEPTED', updated_at = now()
    WHERE id = rec.invite_id;
  END IF;

  -- d) Close competing: decline other pending requests for this single
  UPDATE public.sponsorship_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE single_id = rec.single_id
    AND id != rec.id
    AND status = 'PENDING_SPONSOR_APPROVAL';

  -- e) Update invites linked to those declined requests
  UPDATE public.invites
  SET status = 'DECLINED', updated_at = now()
  WHERE id IN (
    SELECT invite_id FROM public.sponsorship_requests
    WHERE single_id = rec.single_id
      AND id != rec.id
      AND status = 'DECLINED'
      AND invite_id IS NOT NULL
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', rec.id,
    'single_id', rec.single_id,
    'sponsor_id', rec.sponsor_id,
    'status', 'ACCEPTED'
  );
END;
$$;

COMMENT ON FUNCTION public.accept_sponsorship_request_as_sponsor(uuid) IS 'Sponsor accepts a sponsorship request (single invited sponsor). Sets profiles.sponsored_by_id. Declines other pending requests for same single.';

-- ---------------------------------------------------------------------------
-- C) decline_sponsorship_request_as_sponsor(p_request_id uuid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_sponsorship_request_as_sponsor(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, sponsor_id, single_id, invite_id, status
  INTO rec
  FROM public.sponsorship_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship request not found';
  END IF;

  IF rec.sponsor_id != caller_id THEN
    RAISE EXCEPTION 'Only the sponsor can decline this request';
  END IF;

  -- Idempotent: already DECLINED -> return ok
  IF rec.status = 'DECLINED' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', rec.id,
      'single_id', rec.single_id,
      'sponsor_id', rec.sponsor_id,
      'status', rec.status
    );
  END IF;

  IF rec.status = 'ACCEPTED' THEN
    RAISE EXCEPTION 'Request was already accepted; cannot decline';
  END IF;

  IF rec.status != 'PENDING_SPONSOR_APPROVAL' THEN
    RAISE EXCEPTION 'Request is not pending approval (status: %)', rec.status;
  END IF;

  -- a) Update sponsorship_requests
  UPDATE public.sponsorship_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE id = rec.id;

  -- b) Update linked invite
  IF rec.invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'DECLINED', updated_at = now()
    WHERE id = rec.invite_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', rec.id,
    'single_id', rec.single_id,
    'sponsor_id', rec.sponsor_id,
    'status', 'DECLINED'
  );
END;
$$;

COMMENT ON FUNCTION public.decline_sponsorship_request_as_sponsor(uuid) IS 'Sponsor declines a sponsorship request (single invited sponsor).';

-- ---------------------------------------------------------------------------
-- Grant execute to authenticated
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.accept_sponsorship_request_as_sponsor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sponsorship_request_as_sponsor(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_sponsorship_request_as_sponsor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_sponsorship_request_as_sponsor(uuid) TO service_role;
