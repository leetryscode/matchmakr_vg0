-- Drop the existing view
DROP VIEW IF EXISTS conversation_summaries;

-- Recreate the view with user-specific unread counts
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
  -- Unread count for initiator (messages sent TO initiator)
  COALESCE(initiator_unread.count, 0) as initiator_unread_count,
  -- Unread count for recipient (messages sent TO recipient)  
  COALESCE(recipient_unread.count, 0) as recipient_unread_count
FROM conversations c
LEFT JOIN LATERAL (
  SELECT content, created_at
  FROM messages 
  WHERE conversation_id = c.id 
  ORDER BY created_at DESC 
  LIMIT 1
) last_msg ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM messages 
  WHERE conversation_id = c.id
  AND read = false 
  AND conversation_id IS NOT NULL
  AND recipient_id = c.initiator_matchmakr_id
) initiator_unread ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM messages 
  WHERE conversation_id = c.id
  AND read = false 
  AND conversation_id IS NOT NULL
  AND recipient_id = c.recipient_matchmakr_id
) recipient_unread ON true; 