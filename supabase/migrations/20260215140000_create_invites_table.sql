-- Migration: Create invites table for pre-signup invites and pending state
-- Canonical table for invite lifecycle: PENDING -> CLAIMED (or CANCELLED/EXPIRED)
-- Multiple sponsors may invite the same email/phone; no global unique on contact.

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email text NULL,
  invitee_phone_e164 text NULL,
  invitee_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_type public.user_role NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invites_status_check CHECK (status IN ('PENDING', 'CLAIMED', 'CANCELLED', 'EXPIRED'))
);

COMMENT ON TABLE public.invites IS 'Pre-signup invites. PENDING = stored (not necessarily delivered). CLAIMED = matched to user account.';
COMMENT ON COLUMN public.invites.inviter_id IS 'Sponsor (MATCHMAKR) who sent the invite.';
COMMENT ON COLUMN public.invites.invitee_email IS 'Email of invitee. Multiple sponsors may invite same email.';
COMMENT ON COLUMN public.invites.invitee_phone_e164 IS 'E.164 phone of invitee. Multiple sponsors may invite same phone.';
COMMENT ON COLUMN public.invites.invitee_user_id IS 'Set when invite is claimed; links to the created/claimed profile.';
COMMENT ON COLUMN public.invites.target_user_type IS 'Optional: SINGLE, MATCHMAKR, or VENDOR.';
COMMENT ON COLUMN public.invites.status IS 'PENDING (stored), CLAIMED (matched), CANCELLED, or EXPIRED.';

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_invites_inviter_status
ON public.invites (inviter_id, status);

CREATE INDEX IF NOT EXISTS idx_invites_invitee_email
ON public.invites (invitee_email)
WHERE invitee_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invites_invitee_phone_e164
ON public.invites (invitee_phone_e164)
WHERE invitee_phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invites_invitee_user_id
ON public.invites (invitee_user_id)
WHERE invitee_user_id IS NOT NULL;
