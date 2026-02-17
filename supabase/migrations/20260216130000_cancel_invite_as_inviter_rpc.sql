-- Migration: Add cancel_invite_as_inviter RPC for sponsor rescind (disinvite)
-- Allows inviter (sponsor) to cancel their own invite and linked pending sponsorship requests.

CREATE OR REPLACE FUNCTION public.cancel_invite_as_inviter(p_invite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  caller_id uuid;
  cancelled_count int;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock invite row
  SELECT id, inviter_id, status
  INTO rec
  FROM public.invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF rec.inviter_id != caller_id THEN
    RAISE EXCEPTION 'Only the inviter can cancel this invite';
  END IF;

  -- Idempotent: already CANCELLED -> return ok
  IF rec.status = 'CANCELLED' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'invite_id', p_invite_id,
      'invite_status', rec.status,
      'cancelled_requests_count', 0
    );
  END IF;

  -- Terminal safety: ACCEPTED invites cannot be cancelled
  IF rec.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'invite_id', p_invite_id,
      'invite_status', rec.status,
      'cancelled_requests_count', 0,
      'message', 'Cannot rescind an accepted invite'
    );
  END IF;

  -- Cancel linked sponsorship_requests (PENDING_SINGLE_APPROVAL, PENDING_SPONSOR_APPROVAL)
  WITH updated AS (
    UPDATE public.sponsorship_requests
    SET status = 'CANCELLED', updated_at = now()
    WHERE invite_id = p_invite_id
      AND status IN ('PENDING_SINGLE_APPROVAL', 'PENDING_SPONSOR_APPROVAL')
    RETURNING id
  )
  SELECT count(*)::int INTO cancelled_count FROM updated;

  -- Update invite
  UPDATE public.invites
  SET status = 'CANCELLED', updated_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object(
    'ok', true,
    'invite_id', p_invite_id,
    'invite_status', 'CANCELLED',
    'cancelled_requests_count', cancelled_count
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_invite_as_inviter(uuid) IS 'Inviter (sponsor) cancels their own invite. Sets invite to CANCELLED and cancels linked pending sponsorship requests. Idempotent. ACCEPTED invites cannot be cancelled.';

GRANT EXECUTE ON FUNCTION public.cancel_invite_as_inviter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invite_as_inviter(uuid) TO service_role;
