'use client';

import { createClient } from '@/lib/supabase/client';
import MatchMakrChatListClient from './MatchMakrChatListClient';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

const MatchMakrChatList = ({ userId, currentUserName, currentUserProfilePic }: MatchMakrChatListProps) => {
  // Removed console.log to reduce noise - only log when actually fetching
  const [conversations, setConversations] = useState<any[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const lastFetchTimeRef = useRef<number>(0); // Use ref instead of state to avoid dependency issues
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fetchConversations = useCallback(async (forceRefresh = false) => {
    // Prevent excessive API calls - only fetch if forced or if it's been more than 5 seconds
    // Use ref to track last fetch time to avoid dependency issues
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 5000) {
      console.log('[MatchMakrChatList] Skipping fetch - too recent');
      return;
    }

    console.log('[MatchMakrChatList] fetchConversations called. userId:', userId, 'forceRefresh:', forceRefresh);
    
    try {
      setLoading(true);
      // Use the new optimized API endpoint
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();
      
      if (!data.success) {
        console.error('[MatchMakrChatList] Error fetching conversations:', data.error);
        setLoading(false);
        return;
      }
      
      console.log('[MatchMakrChatList] conversationsData:', data.conversations);

      // Build otherProfiles from conversation data
      const otherProfilesData: Record<string, any> = {};
      data.conversations.forEach((conv: any) => {
        const otherUserId = conv.sender_id === userId ? conv.recipient_id : conv.sender_id;
        const otherUser = conv.sender_id === userId ? conv.conversation?.recipient : conv.conversation?.initiator;
        if (otherUser) {
          otherProfilesData[otherUserId] = {
            id: otherUser.id,
            name: otherUser.name,
            profile_pic_url: Array.isArray(otherUser.photos) && otherUser.photos.length > 0 ? otherUser.photos[0] : null,
          };
        }
      });

      setConversations(data.conversations);
      setOtherProfiles(otherProfilesData);
      lastFetchTimeRef.current = now; // Update ref instead of state
      setLoading(false);
    } catch (error) {
      console.error('[MatchMakrChatList] Error fetching conversations:', error);
      setLoading(false);
    }
  }, [userId]); // Stable dependency - callback won't be recreated unless userId changes

  // Single consolidated useEffect to handle all fetch scenarios
  useEffect(() => {
    if (!userId) return;

    let forceRefresh = false;

    // Check for refresh parameter
    const refreshParam = searchParams.get('refresh');
    if (refreshParam === 'true') {
      console.log('[MatchMakrChatList] Detected refresh parameter, clearing URL and refreshing data');
      // Use replace without causing re-render
      const url = new URL(window.location.href);
      url.searchParams.delete('refresh');
      window.history.replaceState({}, '', url.toString());
      forceRefresh = true;
    }

    // Check for chat page visit flag
    if (pathname === '/dashboard/matchmakr') {
      const chatPageVisited = sessionStorage.getItem('chatPageVisited');
      if (chatPageVisited === 'true') {
        console.log('[MatchMakrChatList] Detected return from chat page, refreshing data');
        sessionStorage.removeItem('chatPageVisited');
        forceRefresh = true;
      }
    }

    // Fetch conversations (will check rate limit internally)
    fetchConversations(forceRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId - pathname/searchParams changes handled inside

  if (loading) {
    return (
      <div className="mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <div className="w-12 h-12 bg-white/20 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <MatchMakrChatListClient 
    userId={userId} 
    conversations={conversations} 
    otherProfiles={otherProfiles} 
    sponsoredSingles={[]} 
    currentUserName={currentUserName || ''} 
    currentUserProfilePic={currentUserProfilePic || null} 
  />;
};

// Memoize component to prevent re-renders when props haven't changed
export default memo(MatchMakrChatList); 