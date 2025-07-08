-- Migration: Add clicked_single_id to messages for chat context
ALTER TABLE messages
ADD COLUMN clicked_single_id uuid REFERENCES profiles(id) NULL; 