-- Migration: Add delete_user_data RPC for account deletion
-- SECURITY DEFINER, STRICT, REVOKE from PUBLIC, GRANT to service_role only.

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
  -- Clear sponsored_by_id for singles sponsored by this user
  UPDATE profiles SET sponsored_by_id = NULL WHERE sponsored_by_id = p_user_id;

  -- Delete profile (cascades/set-null handle related rows); FOUND set by DELETE
  DELETE FROM profiles WHERE id = p_user_id RETURNING id INTO v_deleted_id;
  RETURN jsonb_build_object('deleted', FOUND);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
