-- Create conversations table for MatchMakr chats
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_matchmakr_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_matchmakr_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    about_single_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clicked_single_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    match_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

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

-- Indexes for efficient lookups
CREATE INDEX idx_conversations_initiator ON conversations(initiator_matchmakr_id);
CREATE INDEX idx_conversations_recipient ON conversations(recipient_matchmakr_id);
CREATE INDEX idx_conversations_about_single ON conversations(about_single_id);
CREATE INDEX idx_conversations_clicked_single ON conversations(clicked_single_id); 