-- Migration: Fix account deletion FK behavior (v2)
-- Bug #3 (HIGH): Deleting sponsor should NOT delete single's match - SET NULL on matchmakr refs
-- Bug #2: Deleting single should NOT delete sponsor↔sponsor chat - SET NULL on conversation context refs
-- Order: DROP NOT NULL first, then add FK with SET NULL (safer in transactional contexts)

-- 1) Ensure columns allow NULL first
ALTER TABLE public.matches ALTER COLUMN matchmakr_a_id DROP NOT NULL;
ALTER TABLE public.matches ALTER COLUMN matchmakr_b_id DROP NOT NULL;

ALTER TABLE public.conversations ALTER COLUMN about_single_id DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN clicked_single_id DROP NOT NULL;

-- 2) matches.matchmakr_a_id, matchmakr_b_id -> ON DELETE SET NULL
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_matchmakr_a_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_matchmakr_a_id_fkey
  FOREIGN KEY (matchmakr_a_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_matchmakr_b_id_fkey;
ALTER TABLE public.matches ADD CONSTRAINT matches_matchmakr_b_id_fkey
  FOREIGN KEY (matchmakr_b_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3) conversations.about_single_id, clicked_single_id -> ON DELETE SET NULL
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_about_single_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_about_single_id_fkey
  FOREIGN KEY (about_single_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_clicked_single_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_clicked_single_id_fkey
  FOREIGN KEY (clicked_single_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
