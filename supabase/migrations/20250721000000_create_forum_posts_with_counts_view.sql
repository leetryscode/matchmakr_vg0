-- Migration: Create forum_posts_with_counts view for forum post listing

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
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(r.reply_count, 0) AS reply_count
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
  SELECT post_id, COUNT(*) AS reply_count
  FROM forum_replies
  GROUP BY post_id
) r ON p.id = r.post_id; 