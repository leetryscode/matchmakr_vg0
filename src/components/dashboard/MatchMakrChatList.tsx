'use client';

import MatchMakrChatListClient from './MatchMakrChatListClient';
import { memo } from 'react';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

/**
 * MatchMakrChatList
 *
 * Wrapper that passes user identity to MatchMakrChatListClient.
 * Conversation data and unread counts are now provided by
 * RealtimeMessagesContext, so this component no longer owns any fetch or
 * sessionStorage logic.
 */
const MatchMakrChatList = ({
  userId,
  currentUserName,
  currentUserProfilePic,
}: MatchMakrChatListProps) => {
  return (
    <MatchMakrChatListClient
      userId={userId}
      currentUserName={currentUserName || ''}
      currentUserProfilePic={currentUserProfilePic || null}
    />
  );
};

export default memo(MatchMakrChatList);
