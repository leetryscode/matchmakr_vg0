-- Fix the unique constraint on conversations table to handle bidirectional conversations
-- Drop the old unique constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_initiator_matchmakr_id_recipient_matchmakr_id_about_single_id_clicked_single_id_key;

-- Create a unique constraint that handles both directions
-- This ensures that conversations between the same MatchMakrs about the same singles are unique
-- regardless of who initiated the conversation
CREATE UNIQUE INDEX idx_conversations_unique_bidirectional 
ON conversations (
    LEAST(initiator_matchmakr_id, recipient_matchmakr_id),
    GREATEST(initiator_matchmakr_id, recipient_matchmakr_id),
    about_single_id,
    clicked_single_id
); 