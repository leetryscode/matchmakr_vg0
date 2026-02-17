-- Patch: Fix accept_sponsorship_request_as_sponsor cleanup logic
-- 1) Use CTE so invite cleanup only touches rows we just declined
-- 2) Decline both PENDING_SPONSOR_APPROVAL and PENDING_SINGLE_APPROVAL when sponsor accepts
-- 3) Self-healing: in idempotent ACCEPTED branch, ensure profiles.sponsored_by_id if null

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

  -- Idempotent: already ACCEPTED -> run cleanup, self-heal profile, then return ok
  IF rec.status = 'ACCEPTED' THEN
    UPDATE public.profiles
    SET sponsored_by_id = rec.sponsor_id
    WHERE id = rec.single_id AND sponsored_by_id IS NULL;

    WITH declined AS (
      UPDATE public.sponsorship_requests
      SET status = 'DECLINED', updated_at = now()
      WHERE single_id = rec.single_id
        AND id != rec.id
        AND status IN ('PENDING_SPONSOR_APPROVAL', 'PENDING_SINGLE_APPROVAL')
      RETURNING invite_id
    )
    UPDATE public.invites
    SET status = 'DECLINED', updated_at = now()
    WHERE id IN (SELECT invite_id FROM declined WHERE invite_id IS NOT NULL);

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

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = rec.single_id
      AND sponsored_by_id IS NOT NULL
      AND sponsored_by_id != rec.sponsor_id
  ) THEN
    RAISE EXCEPTION 'This single already has a sponsor.';
  END IF;

  UPDATE public.sponsorship_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = rec.id;

  UPDATE public.profiles
  SET sponsored_by_id = rec.sponsor_id
  WHERE id = rec.single_id;

  IF rec.invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'ACCEPTED', updated_at = now()
    WHERE id = rec.invite_id;
  END IF;

  WITH declined AS (
    UPDATE public.sponsorship_requests
    SET status = 'DECLINED', updated_at = now()
    WHERE single_id = rec.single_id
      AND id != rec.id
      AND status IN ('PENDING_SPONSOR_APPROVAL', 'PENDING_SINGLE_APPROVAL')
    RETURNING invite_id
  )
  UPDATE public.invites
  SET status = 'DECLINED', updated_at = now()
  WHERE id IN (SELECT invite_id FROM declined WHERE invite_id IS NOT NULL);

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', rec.id,
    'single_id', rec.single_id,
    'sponsor_id', rec.sponsor_id,
    'status', 'ACCEPTED'
  );
END;
$$;

COMMENT ON FUNCTION public.accept_sponsorship_request_as_sponsor(uuid) IS
'Sponsor accepts a sponsorship request (single invited sponsor). Sets profiles.sponsored_by_id. Declines other pending requests (both directions) for same single. Idempotent with self-healing.';
