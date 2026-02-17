-- Migration: Add phone_e164 to profiles
-- Enables future invite matching by phone; partial unique index prevents duplicate phones.
-- Do not depend on this column yet; it is additive.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_e164 TEXT NULL;

COMMENT ON COLUMN public.profiles.phone_e164 IS 'E.164 formatted phone number. Used for invite matching and deduplication.';

-- Partial unique index: unique when not null (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_e164_unique
ON public.profiles (phone_e164)
WHERE phone_e164 IS NOT NULL;
