-- Add client_message_id to messages for reliable optimistic dedup on the client.
-- Generated UUID on the client at send time; stored server-side so realtime INSERT
-- events carry it back for exact matching instead of content + sender_id matching.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id uuid;

-- Partial unique index: enforces uniqueness only for non-null values,
-- so existing rows and server-originated messages are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_id_key
  ON messages (client_message_id)
  WHERE client_message_id IS NOT NULL;
