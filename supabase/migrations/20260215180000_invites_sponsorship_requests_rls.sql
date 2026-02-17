-- Migration: RLS on invites and sponsorship_requests
-- Enables safe client reads for sponsor and single dashboards.
-- Inserts/updates remain via edge functions, triggers, and RPCs (service role or SECURITY DEFINER).
--
-- UPDATE policy choice: No UPDATE policy for authenticated users.
-- - invites: updated by sponsor-single edge function, handle_new_user trigger, accept/decline RPCs (all service role or SECURITY DEFINER)
-- - sponsorship_requests: updated only by accept/decline RPCs (SECURITY DEFINER)
-- This keeps client writes out of these tables; RLS stays minimal and safe.

-- ---------------------------------------------------------------------------
-- 1) Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) invites policies
-- ---------------------------------------------------------------------------

-- SELECT: sponsor sees their invites; single sees invites where they are the invitee
CREATE POLICY "invites_select_own_or_as_invitee"
ON public.invites
FOR SELECT
TO authenticated
USING (
  inviter_id = auth.uid()
  OR invitee_user_id = auth.uid()
);

-- INSERT: sponsor can create invites for themselves (edge function uses service role; this is a safety net)
CREATE POLICY "invites_insert_own"
ON public.invites
FOR INSERT
TO authenticated
WITH CHECK (inviter_id = auth.uid());

-- No UPDATE policy for authenticated: updates via service role (edge function, trigger, RPC)

-- ---------------------------------------------------------------------------
-- 3) sponsorship_requests policies
-- ---------------------------------------------------------------------------

-- SELECT: sponsor sees their requests; single sees requests assigned to them
CREATE POLICY "sponsorship_requests_select_own"
ON public.sponsorship_requests
FOR SELECT
TO authenticated
USING (
  sponsor_id = auth.uid()
  OR single_id = auth.uid()
);

-- INSERT: sponsor can create requests for themselves (edge function uses service role; safety net)
CREATE POLICY "sponsorship_requests_insert_own"
ON public.sponsorship_requests
FOR INSERT
TO authenticated
WITH CHECK (sponsor_id = auth.uid());

-- No UPDATE policy for authenticated: updates only via accept/decline RPCs (SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- Read query guidance
-- ---------------------------------------------------------------------------
-- Sponsor dashboard: invites by inviter, newest first
--   SELECT * FROM invites WHERE inviter_id = auth.uid() ORDER BY created_at DESC;
--
-- Single dashboard: pending sponsorship requests
--   SELECT * FROM sponsorship_requests
--   WHERE single_id = auth.uid() AND status = 'PENDING_SINGLE_APPROVAL'
--   ORDER BY created_at DESC;
