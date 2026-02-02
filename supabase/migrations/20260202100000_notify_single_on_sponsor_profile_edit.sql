-- Migration: Notify single when their sponsor edits their profile
-- Trigger fires on profiles UPDATE when sponsor (sponsored_by_id) is the updater
-- Meaningful-change guard: only fires when content fields change (not updated_at, counters, etc.)
-- 6-hour cooldown prevents notification spam during multi-edit sessions
--
-- ID equivalence: profiles.id = auth.users.id (profiles.id references auth.users).
-- sponsored_by_id references profiles(id), so sponsored_by_id = sponsor's profile id = sponsor's auth id.
-- Thus NEW.sponsored_by_id = auth.uid() when the sponsor edits.

CREATE OR REPLACE FUNCTION public.notify_single_on_sponsor_profile_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only when: single's profile, updater is their sponsor, auth.uid() present (not service-role)
  -- Meaningful-change gate is in trigger WHEN clause for performance
  IF NEW.user_type = 'SINGLE'
     AND NEW.sponsored_by_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND NEW.sponsored_by_id = auth.uid()
  THEN
    -- 6-hour cooldown: skip if we already notified this single in the last 6 hours
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.id
        AND type = 'sponsor_updated_profile'
        AND created_at > now() - interval '6 hours'
    ) THEN
      INSERT INTO public.notifications (user_id, type, data, read, dismissed_at)
      VALUES (NEW.id, 'sponsor_updated_profile', jsonb_build_object('reason','sponsor_edit','created_by','system'), false, null);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_sponsor_profile_edit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.bio IS DISTINCT FROM NEW.bio
    OR OLD.matchmakr_endorsement IS DISTINCT FROM NEW.matchmakr_endorsement
    OR OLD.photos IS DISTINCT FROM NEW.photos
    OR OLD.pairings_signal IS DISTINCT FROM NEW.pairings_signal
    OR OLD.introduction_signal IS DISTINCT FROM NEW.introduction_signal
  )
  EXECUTE FUNCTION public.notify_single_on_sponsor_profile_edit();

COMMENT ON FUNCTION public.notify_single_on_sponsor_profile_edit() IS 'Creates sponsor_updated_profile notification when sponsor edits their single’s profile. Only fires on bio, matchmakr_endorsement, photos, pairings_signal, or introduction_signal changes. 6-hour cooldown per single.';
