-- Add conversation_id to messages table
ALTER TABLE messages
ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id); 