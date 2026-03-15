-- Migration: Create tos_acceptances for legal consent audit trail
-- Stores Terms of Service + Privacy Policy acceptance records by user.

-- ---------------------------------------------------------------------------
-- 1) Create tos_acceptances table
-- ---------------------------------------------------------------------------
CREATE TABLE public.tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tos_version text NOT NULL,
  privacy_policy_version text NOT NULL,
  age_confirmed boolean NOT NULL DEFAULT false,
  ip_address text NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tos_acceptances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.tos_acceptances IS
  'Audit log of Terms of Service and Privacy Policy acceptance for each user.';
COMMENT ON COLUMN public.tos_acceptances.user_id IS
  'Profile/user who accepted legal terms.';
COMMENT ON COLUMN public.tos_acceptances.tos_version IS
  'Accepted Terms of Service version (for example: 1.0).';
COMMENT ON COLUMN public.tos_acceptances.privacy_policy_version IS
  'Accepted Privacy Policy version (for example: 1.0).';
COMMENT ON COLUMN public.tos_acceptances.age_confirmed IS
  'Whether user confirmed or met 18+ requirement at acceptance time.';
COMMENT ON COLUMN public.tos_acceptances.ip_address IS
  'Requester IP at acceptance time when available.';
COMMENT ON COLUMN public.tos_acceptances.accepted_at IS
  'Timestamp when terms were accepted.';

-- ---------------------------------------------------------------------------
-- 2) Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_tos_acceptances_user_id
  ON public.tos_acceptances (user_id);

CREATE INDEX idx_tos_acceptances_user_id_accepted_at
  ON public.tos_acceptances (user_id, accepted_at DESC);

-- ---------------------------------------------------------------------------
-- 3) RLS + policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tos_acceptances_select_own"
ON public.tos_acceptances
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "tos_acceptances_insert_own"
ON public.tos_acceptances
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
