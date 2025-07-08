-- Migration: Add about_single_id to messages for single context in matchmakr chats
ALTER TABLE messages
ADD COLUMN about_single_id uuid REFERENCES profiles(id) NULL; 