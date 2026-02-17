-- Migration: Create sponsorship_requests table for sponsor↔single approval flow
-- Holds pending state before profiles.sponsored_by_id is set.
-- Prevents overloading profiles with approval state.

CREATE TABLE public.sponsorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  single_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_id uuid NULL REFERENCES public.invites(id) ON DELETE SET NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsorship_requests_sponsor_single_unique UNIQUE (sponsor_id, single_id),
  CONSTRAINT sponsorship_requests_status_check CHECK (status IN ('PENDING_SINGLE_APPROVAL', 'ACCEPTED', 'DECLINED', 'CANCELLED'))
);

COMMENT ON TABLE public.sponsorship_requests IS 'Sponsor↔single approval flow. Pending state before profiles.sponsored_by_id is set.';
COMMENT ON COLUMN public.sponsorship_requests.sponsor_id IS 'MATCHMAKR requesting to sponsor the single.';
COMMENT ON COLUMN public.sponsorship_requests.single_id IS 'SINGLE who must approve or decline.';
COMMENT ON COLUMN public.sponsorship_requests.invite_id IS 'Optional: links to invite when request came from claimed invite.';
COMMENT ON COLUMN public.sponsorship_requests.status IS 'PENDING_SINGLE_APPROVAL, ACCEPTED, DECLINED, or CANCELLED.';
