-- Migration: Accept / Decline sponsorship RPCs
-- Atomic server-side actions for single to approve or reject sponsorship requests.
-- Only the single (auth.uid() = single_id) can call these.

-- Allow invites to transition to ACCEPTED/DECLINED when sponsorship is resolved
-- Note: long-term, consider migrating invites.status to a Postgres enum (invite_status) for cleaner evolution
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_status_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_status_check
  CHECK (status IN ('PENDING', 'CLAIMED', 'CANCELLED', 'EXPIRED', 'ACCEPTED', 'DECLINED'));

-- ---------------------------------------------------------------------------
-- 1) accept_sponsorship_request(p_request_id uuid)
-- ---------------------------------------------------------------------------
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

  -- Idempotent: already ACCEPTED -> return ok without changes
  IF rec.status = 'ACCEPTED' THEN
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

  -- Nice-to-have: single already has a different sponsor
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

  -- c) Update invite if linked
  IF rec.invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'ACCEPTED', updated_at = now()
    WHERE id = rec.invite_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', rec.id,
    'single_id', rec.single_id,
    'sponsor_id', rec.sponsor_id,
    'status', 'ACCEPTED'
  );
END;
$$;

COMMENT ON FUNCTION public.accept_sponsorship_request(uuid) IS 'Single accepts a sponsorship request. Sets profiles.sponsored_by_id. Idempotent if already ACCEPTED.';

-- ---------------------------------------------------------------------------
-- 2) decline_sponsorship_request(p_request_id uuid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_sponsorship_request(p_request_id uuid)
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
    RAISE EXCEPTION 'Only the single can decline this request';
  END IF;

  -- Idempotent: already DECLINED -> return ok without changes
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

  IF rec.status != 'PENDING_SINGLE_APPROVAL' THEN
    RAISE EXCEPTION 'Request is not pending approval (status: %)', rec.status;
  END IF;

  -- a) Update sponsorship_requests
  UPDATE public.sponsorship_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE id = rec.id;

  -- b) Update invite if linked
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

COMMENT ON FUNCTION public.decline_sponsorship_request(uuid) IS 'Single declines a sponsorship request.';

-- ---------------------------------------------------------------------------
-- Grant execute to authenticated users (authorization enforced inside function)
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.accept_sponsorship_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sponsorship_request(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_sponsorship_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_sponsorship_request(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Quick SQL test sequence (run as the single user, or use service_role):
-- ---------------------------------------------------------------------------
-- 1. Find a pending request for your single:
--    SELECT id, sponsor_id, single_id, invite_id, status
--    FROM sponsorship_requests
--    WHERE single_id = auth.uid() AND status = 'PENDING_SINGLE_APPROVAL';
--
-- 2. Accept it:
--    SELECT public.accept_sponsorship_request('<request_id>');
--
-- 3. Verify:
--    SELECT id, sponsored_by_id FROM profiles WHERE id = auth.uid();
--    SELECT id, status FROM invites WHERE id = '<invite_id>';
--
-- 4. Decline test (create new request first, then):
--    SELECT public.decline_sponsorship_request('<request_id>');
