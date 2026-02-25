-- Migration: Fix FK constraints for account deletion
-- Enables clean deletion: profiles.sponsored_by_id SET NULL, matches CASCADE,
-- messages SET NULL (anonymize), notifications CASCADE.

-- 1) profiles.sponsored_by_id -> ON DELETE SET NULL (singles lose sponsor when sponsor deleted)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_sponsored_by_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_sponsored_by_id_fkey
  FOREIGN KEY (sponsored_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2) matches.*_id -> ON DELETE CASCADE
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_single_a_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_single_a_id_fkey
  FOREIGN KEY (single_a_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_single_b_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_single_b_id_fkey
  FOREIGN KEY (single_b_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_matchmakr_a_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_matchmakr_a_id_fkey
  FOREIGN KEY (matchmakr_a_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_matchmakr_b_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_matchmakr_b_id_fkey
  FOREIGN KEY (matchmakr_b_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) messages: allow NULL on profile FKs, ON DELETE SET NULL (preserve message history, anonymize)
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN about_single_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN clicked_single_id DROP NOT NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_about_single_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_about_single_id_fkey
  FOREIGN KEY (about_single_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_clicked_single_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_clicked_single_id_fkey
  FOREIGN KEY (clicked_single_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4) notifications.user_id -> ON DELETE CASCADE
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
