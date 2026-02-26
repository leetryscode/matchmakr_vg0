-- Migration: Dismiss sponsor-related notifications for singles when sponsor is deleted
-- Must capture affected singles BEFORE clearing sponsored_by_id, then dismiss, then clear, then delete profile.
-- All steps run in a single transaction (Postgres function default).
-- Note: This RPC deletes profiles row only. auth.users deletion is handled elsewhere (e.g. Supabase Auth admin).

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STRICT
SET search_path = public
AS $$
DECLARE
  v_deleted_id uuid;
BEGIN
  -- 1. Capture singles who will lose this sponsor (BEFORE clearing)
  -- 2. Dismiss sponsor-related notifications for those singles
  WITH affected_singles AS (
    SELECT id FROM profiles WHERE sponsored_by_id = p_user_id
  )
  UPDATE notifications
  SET dismissed_at = now()
  WHERE user_id IN (SELECT id FROM affected_singles)
    AND type IN ('sponsor_logged_in', 'matchmakr_chat', 'sponsor_updated_profile')
    AND dismissed_at IS NULL;

  -- 3. Clear sponsored_by_id for singles sponsored by this user
  UPDATE profiles SET sponsored_by_id = NULL WHERE sponsored_by_id = p_user_id;

  -- 4. Delete profile (cascades/set-null handle related rows); FOUND set by DELETE
  DELETE FROM profiles WHERE id = p_user_id RETURNING id INTO v_deleted_id;
  RETURN jsonb_build_object('deleted', FOUND);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
