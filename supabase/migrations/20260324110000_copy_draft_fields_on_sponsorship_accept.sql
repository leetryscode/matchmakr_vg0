-- Migration: Copy invite draft fields to profile on sponsorship acceptance
-- Replaces accept_sponsorship_request with a version that, after setting
-- sponsored_by_id, reads the linked invite row and copies any non-null draft
-- fields into the profile — never overwriting data the single already filled
-- in during onboarding.
--
-- Copy rules (only applied when invite row exists and field is NOT NULL):
--   invites.invitee_label           → profiles.name              (only if name IS NULL)
--   invites.draft_endorsement       → profiles.matchmakr_endorsement (only if NULL)
--   invites.draft_pairings_signal   → profiles.pairings_signal   (only if NULL)
--   invites.draft_introduction_signal → profiles.introduction_signal (only if NULL)
--   invites.draft_photos            → profiles.photos             (only if empty/NULL)

CREATE OR REPLACE FUNCTION public.accept_sponsorship_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec       record;
  inv       record;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, sponsor_id, single_id, invite_id, status
  INTO rec
  FROM public.sponsorship_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship request not found';
  END IF;

  IF rec.single_id != caller_id THEN
    RAISE EXCEPTION 'Only the single can accept this request';
  END IF;

  -- Idempotent: already ACCEPTED -> return ok without changes
  IF rec.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', rec.id,
      'single_id', rec.single_id,
      'sponsor_id', rec.sponsor_id,
      'status', rec.status
    );
  END IF;

  IF rec.status != 'PENDING_SINGLE_APPROVAL' THEN
    RAISE EXCEPTION 'Request is not pending approval (status: %)', rec.status;
  END IF;

  -- Single already has a different sponsor
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = rec.single_id
      AND sponsored_by_id IS NOT NULL
      AND sponsored_by_id != rec.sponsor_id
  ) THEN
    RAISE EXCEPTION 'You already have a sponsor. End that sponsorship first.';
  END IF;

  -- a) Update sponsorship_requests
  UPDATE public.sponsorship_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = rec.id;

  -- b) Set profiles.sponsored_by_id
  UPDATE public.profiles
  SET sponsored_by_id = rec.sponsor_id
  WHERE id = rec.single_id;

  -- c) Update invite if linked
  IF rec.invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET status = 'ACCEPTED', updated_at = now()
    WHERE id = rec.invite_id;
  END IF;

  -- d) Copy draft fields from invite to profile (non-destructive)
  --    Only runs when there is a linked invite with draft data.
  --    Each field is only written if the profile field is still empty/null,
  --    so onboarding data the single entered always wins.
  IF rec.invite_id IS NOT NULL THEN
    SELECT id,
           invitee_label,
           draft_endorsement,
           draft_pairings_signal,
           draft_introduction_signal,
           draft_photos
    INTO inv
    FROM public.invites
    WHERE id = rec.invite_id;

    IF FOUND THEN
      UPDATE public.profiles
      SET
        -- name: only fill if single never set one during onboarding
        name = CASE
          WHEN name IS NULL AND inv.invitee_label IS NOT NULL
          THEN inv.invitee_label
          ELSE name
        END,

        -- endorsement: only fill if sponsor hasn't written one on the live profile yet
        matchmakr_endorsement = CASE
          WHEN matchmakr_endorsement IS NULL AND inv.draft_endorsement IS NOT NULL
          THEN inv.draft_endorsement
          ELSE matchmakr_endorsement
        END,

        -- pairings signal: only fill if not already set
        pairings_signal = CASE
          WHEN pairings_signal IS NULL AND inv.draft_pairings_signal IS NOT NULL
          THEN inv.draft_pairings_signal
          ELSE pairings_signal
        END,

        -- introduction signal: only fill if not already set
        introduction_signal = CASE
          WHEN introduction_signal IS NULL AND inv.draft_introduction_signal IS NOT NULL
          THEN inv.draft_introduction_signal
          ELSE introduction_signal
        END,

        -- photos: only fill if profile has no photos yet (empty array or null)
        photos = CASE
          WHEN (photos IS NULL OR photos = '{}')
               AND inv.draft_photos IS NOT NULL
               AND array_length(inv.draft_photos, 1) > 0
          THEN inv.draft_photos
          ELSE photos
        END

      WHERE id = rec.single_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', rec.id,
    'single_id', rec.single_id,
    'sponsor_id', rec.sponsor_id,
    'status', 'ACCEPTED'
  );
END;
$$;

COMMENT ON FUNCTION public.accept_sponsorship_request(uuid) IS
  'Single accepts a sponsorship request. Sets profiles.sponsored_by_id. '
  'Copies non-null draft fields from the linked invite to the profile (non-destructive — '
  'never overwrites data the single filled in during onboarding). Idempotent if already ACCEPTED.';
