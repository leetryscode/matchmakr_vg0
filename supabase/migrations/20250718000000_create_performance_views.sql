-- Create database views for performance optimization

-- View for conversation summaries with pre-computed data
CREATE VIEW conversation_summaries AS
SELECT 
  c.id,
  c.initiator_matchmakr_id,
  c.recipient_matchmakr_id,
  c.about_single_id,
  c.clicked_single_id,
  c.status,
  c.match_status,
  c.created_at,
  -- Last message info
  last_msg.content as last_message_content,
  last_msg.created_at as last_message_time,
  -- Unread count (only count messages sent TO the current user in this conversation)
  COALESCE(unread_counts.count, 0) as unread_count
FROM conversations c
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM messages 
  WHERE conversation_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) last_msg ON true
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as count
  FROM messages 
  WHERE read = false 
  AND conversation_id IS NOT NULL
  GROUP BY conversation_id
) unread_counts ON unread_counts.conversation_id = c.id;

-- View for profiles with interests (eliminates separate API calls)
CREATE VIEW profile_with_interests AS
SELECT 
  p.*,
  ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as interest_names,
  ARRAY_AGG(DISTINCT i.id) FILTER (WHERE i.id IS NOT NULL) as interest_ids
FROM profiles p
LEFT JOIN profile_interests pi ON p.id = pi.profile_id
LEFT JOIN interests i ON pi.interest_id = i.id
WHERE p.user_type = 'SINGLE' AND p.sponsored_by_id IS NOT NULL
GROUP BY p.id, p.user_type, p.name, p.sex, p.birth_year, p.bio, p.occupation, p.location, p.photos, p.business_name, p.industry, p.offer, p.sponsored_by_id, p.matchmakr_endorsement, p.created_at;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_type_sponsored ON profiles(user_type, sponsored_by_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_profile_interests_profile ON profile_interests(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC); 