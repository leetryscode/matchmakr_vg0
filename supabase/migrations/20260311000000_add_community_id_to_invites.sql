-- Migration: Add explicit community context to invites
-- Slice 1 of Invite Explicit Community Context implementation
-- Adds optional community_id to invites table

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS community_id uuid NULL;

-- Add foreign key constraint to communities
ALTER TABLE public.invites
ADD CONSTRAINT invites_community_id_fkey
FOREIGN KEY (community_id)
REFERENCES public.communities(id)
ON DELETE SET NULL
NOT VALID;

-- Index for lookups on invites tied to communities
CREATE INDEX IF NOT EXISTS idx_invites_community_id
ON public.invites (community_id)
WHERE community_id IS NOT NULL;

-- Document column purpose
COMMENT ON COLUMN public.invites.community_id
IS 'Optional community context. NULL = general Orbit invite. Set = invite tied to specific community.';
