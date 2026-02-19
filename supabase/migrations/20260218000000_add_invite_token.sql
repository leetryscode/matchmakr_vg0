-- Migration: Add token column to invites for shareable invite links
-- Token is used in /invite/:token route; anon users can fetch invite metadata via API (server-side).
-- Existing invites: token NULL (legacy, no link). New invites: token generated on insert.

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS token text NULL;

-- Unique index: only one invite per token; NULL tokens allowed for legacy rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token
ON public.invites (token)
WHERE token IS NOT NULL;

COMMENT ON COLUMN public.invites.token IS 'Shareable token for invite link (/invite/:token). NULL for legacy invites.';
