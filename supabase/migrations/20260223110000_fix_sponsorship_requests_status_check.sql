-- Migration: Add PENDING_SPONSOR_APPROVAL to sponsorship_requests_status_check
--
-- Live DB had old constraint: ('PENDING_SINGLE_APPROVAL','ACCEPTED','DECLINED','CANCELLED')
-- which breaks Single->Sponsor JOIN (handle_new_user inserts 'PENDING_SPONSOR_APPROVAL').
--
-- Fix: Drop and re-add constraint with all five statuses.
-- Idempotent: safe to re-run. Preserves all existing data (no table drop).
--
-- Verify after migration:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='sponsorship_requests_status_check';
-- Expected: CHECK ((status = ANY (ARRAY['PENDING_SINGLE_APPROVAL'::text, 'PENDING_SPONSOR_APPROVAL'::text, 'ACCEPTED'::text, 'DECLINED'::text, 'CANCELLED'::text])))

ALTER TABLE public.sponsorship_requests DROP CONSTRAINT IF EXISTS sponsorship_requests_status_check;
ALTER TABLE public.sponsorship_requests ADD CONSTRAINT sponsorship_requests_status_check
  CHECK (status IN ('PENDING_SINGLE_APPROVAL', 'PENDING_SPONSOR_APPROVAL', 'ACCEPTED', 'DECLINED', 'CANCELLED'));
