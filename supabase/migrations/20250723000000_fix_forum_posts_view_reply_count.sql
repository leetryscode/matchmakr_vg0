-- Migration: Fix forum_posts_with_counts view to count replies from forum_posts table

DROP VIEW IF EXISTS forum_posts_with_counts;

CREATE OR REPLACE VIEW forum_posts_with_counts AS
SELECT
  p.id,
  p.content,
  p.category_id,
  c.name AS category_name,
  p.author_id AS user_id,
  pr.name AS user_name,
  pr.user_type,
  p.created_at,
  p.parent_post_id,
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(r.reply_count, 0) AS reply_count,
  pr.photos AS user_photos
FROM forum_posts p
JOIN forum_categories c ON p.category_id = c.id
JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS like_count
  FROM forum_likes
  WHERE post_id IS NOT NULL
  GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
  SELECT parent_post_id, COUNT(*) AS reply_count
  FROM forum_posts
  WHERE parent_post_id IS NOT NULL
  GROUP BY parent_post_id
) r ON p.id = r.parent_post_id; 