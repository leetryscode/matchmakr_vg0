-- Migration: Invite claim on signup in handle_new_user()
-- After inserting profile, attempt to claim a PENDING invite by email.
-- Creates sponsorship_request and notification when invite is claimed.
-- VENDOR handling unchanged (skipped; handle_new_vendor used).
--
-- Assumptions:
-- - auth.users has email column (Supabase default)
-- - invites.claimed_at added in this migration
-- - sponsor_label not on invites; notification data uses sponsor_name from profiles, sponsor_label=null
--
-- Future: extend claim logic to match by invitee_phone_e164 when new.raw_user_meta_data includes
-- phone or phone is collected pre-signup. profiles.phone_e164 already exists for this.
--
-- Test checklist:
-- 1. As MATCHMAKR, create invite for email that does not exist (e.g. newuser@example.com)
-- 2. Sign up as SINGLE with that exact email (via onboarding or auth)
-- 3. Verify: invites row status='CLAIMED', invitee_user_id=new user id, claimed_at set
-- 4. Verify: sponsorship_requests row exists (sponsor_id, single_id, status='PENDING_SINGLE_APPROVAL', invite_id)
-- 5. Verify: notifications row for new user (type='sponsorship_request', data has sponsor_id, request_id, sponsor_name)

-- Add claimed_at to invites (optional; used when invite is claimed)
ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;

COMMENT ON COLUMN public.invites.claimed_at IS 'When invite was claimed (user signed up with matching email).';

-- Recreate handle_new_user with invite-claim logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_bd text;
  meta_by text;
  bd date;
  birth_year_val integer;
  ot text;
  slug text;
  normalized_email text;
  rec_invite record;
  new_request_id uuid;
  sponsor_name text;
BEGIN
  -- VENDOR: skip (handled by handle_new_vendor)
  IF (new.raw_user_meta_data->>'user_type')::user_role = 'VENDOR' THEN
    RETURN new;
  END IF;

  meta_bd := NULLIF(TRIM(new.raw_user_meta_data->>'birth_date'), '');
  meta_by := NULLIF(TRIM(new.raw_user_meta_data->>'birth_year'), '');

  IF meta_bd IS NOT NULL THEN
    bd := meta_bd::date;
    birth_year_val := EXTRACT(YEAR FROM bd)::integer;
  ELSIF meta_by IS NOT NULL THEN
    birth_year_val := meta_by::integer;
    bd := (meta_by || '-01-01')::date;
  ELSE
    bd := NULL;
    birth_year_val := NULL;
  END IF;

  ot := NULLIF(TRIM(new.raw_user_meta_data->>'open_to'), '');
  slug := NULLIF(TRIM(new.raw_user_meta_data->>'orbit_community_slug'), '');

  INSERT INTO public.profiles (
    id, user_type, name, sex, birth_year, birth_date, occupation,
    open_to, orbit_community_slug
  )
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'user_type')::user_role,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'sex',
    birth_year_val,
    bd,
    new.raw_user_meta_data->>'occupation',
    ot,
    slug
  );

  -- Invite claim: only for SINGLE users with non-empty email
  IF (new.raw_user_meta_data->>'user_type')::user_role = 'SINGLE'
     AND new.email IS NOT NULL
     AND TRIM(new.email) != ''
  THEN
    normalized_email := lower(trim(new.email));

    SELECT id, inviter_id
    INTO rec_invite
    FROM public.invites
    WHERE status = 'PENDING'
      AND invitee_user_id IS NULL
      AND invitee_email = normalized_email
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      -- a) Update invite: CLAIMED, invitee_user_id, claimed_at
      UPDATE public.invites
      SET status = 'CLAIMED',
          invitee_user_id = new.id,
          updated_at = now(),
          claimed_at = now()
      WHERE id = rec_invite.id;

      -- b) Insert sponsorship_request; ON CONFLICT DO NOTHING
      INSERT INTO public.sponsorship_requests (
        sponsor_id, single_id, invite_id, status
      )
      VALUES (
        rec_invite.inviter_id,
        new.id,
        rec_invite.id,
        'PENDING_SINGLE_APPROVAL'
      )
      ON CONFLICT (sponsor_id, single_id) DO NOTHING
      RETURNING id INTO new_request_id;

      -- c) Notification only if new row was created
      IF new_request_id IS NOT NULL THEN
        SELECT name INTO sponsor_name
        FROM public.profiles
        WHERE id = rec_invite.inviter_id;

        INSERT INTO public.notifications (user_id, type, data, read, dismissed_at)
        VALUES (
          new.id,
          'sponsorship_request',
          jsonb_build_object(
            'request_id', new_request_id,
            'invite_id', rec_invite.id,
            'sponsor_id', rec_invite.inviter_id,
            'sponsor_name', coalesce(sponsor_name, 'Someone')
          ),
          false,
          null
        );
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile on auth signup. For SINGLE users, claims PENDING invite by email and creates sponsorship_request + notification.';
