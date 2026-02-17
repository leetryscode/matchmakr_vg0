-- Migration: Add invitee_label to invites for sponsor-facing display
-- Allows sponsors to see a friendly label (e.g. "Pam") instead of email on invite cards.

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS invitee_label text NULL;

COMMENT ON COLUMN public.invites.invitee_label IS 'Friendly label for invitee (e.g. "Pam"). Sponsor-provided, for display on invite cards. NULL if not set.';
