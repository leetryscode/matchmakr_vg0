-- Migration: accept_sponsorship_request closes competing requests
-- When a single accepts one sponsor, automatically decline all other pending requests for that single.
-- Idempotent: if request already ACCEPTED, still runs cleanup (decline other pending).

CREATE OR REPLACE FUNCTION public.accept_sponsorship_request(p_request_id uuid)
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

  IF rec.single_id != caller_id THEN
    RAISE EXCEPTION 'Only the single can accept this request';
  END IF;

  -- Idempotent: already ACCEPTED -> run cleanup, then return ok
  IF rec.status = 'ACCEPTED' THEN
    -- Cleanup: decline other pending requests for this single
    UPDATE public.sponsorship_requests
    SET status = 'DECLINED', updated_at = now()
    WHERE single_id = rec.single_id
      AND id != rec.id
      AND status = 'PENDING_SINGLE_APPROVAL';

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

  IF rec.status != 'PENDING_SINGLE_APPROVAL' THEN
    RAISE EXCEPTION 'Request is not pending approval (status: %)', rec.status;
  END IF;

  -- Single already has a different sponsor
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = rec.single_id
      AND sponsored_by_id IS NOT NULL
      AND sponsored_by_id != rec.sponsor_id
  ) THEN
    RAISE EXCEPTION 'You already have a sponsor. End that sponsorship first.';
  END IF;

  -- a) Update sponsorship_requests
  UPDATE public.sponsorship_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = rec.id;

  -- b) Set profiles.sponsored_by_id
  UPDATE public.profiles
  SET sponsored_by_id = rec.sponsor_id
  WHERE id = rec.single_id;

  -- c) Update linked invite for accepted request
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
    AND status = 'PENDING_SINGLE_APPROVAL';

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

COMMENT ON FUNCTION public.accept_sponsorship_request(uuid) IS 'Single accepts a sponsorship request. Sets profiles.sponsored_by_id. Declines other pending requests for same single. Idempotent if already ACCEPTED.';
