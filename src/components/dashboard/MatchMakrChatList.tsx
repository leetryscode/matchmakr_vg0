'use client';

import { createClient } from '@/lib/supabase/client';
import MatchMakrChatListClient from './MatchMakrChatListClient';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

const MatchMakrChatList = ({ userId, currentUserName, currentUserProfilePic }: MatchMakrChatListProps) => {
  console.log('[MatchMakrChatList] Component mounted. userId:', userId);
  const [conversations, setConversations] = useState<any[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fetchConversations = async () => {
    console.log('[MatchMakrChatList] fetchConversations called. userId:', userId);
    
    try {
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
      setLoading(false);
    } catch (error) {
      console.error('[MatchMakrChatList] Error fetching conversations:', error);
      setLoading(false);
    }
  };

  // Check if we're coming from pond with refresh parameter
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam === 'true') {
      console.log('[MatchMakrChatList] Detected refresh parameter, clearing URL and refreshing data');
      // Clear the refresh parameter from URL
      router.replace('/dashboard/matchmakr');
      // Force refresh by calling fetchConversations directly
      fetchConversations();
    }
  }, [searchParams, router]);

  // Refresh conversations when returning to dashboard (pathname changes)
  useEffect(() => {
    // Only refresh when on the matchmakr dashboard page
    if (pathname === '/dashboard/matchmakr') {
      console.log('[MatchMakrChatList] Refreshing conversations on dashboard return');
      fetchConversations();
    }
  }, [pathname, userId]);

  // Check for chat page visit flag and refresh data
  useEffect(() => {
    if (pathname === '/dashboard/matchmakr') {
      const chatPageVisited = sessionStorage.getItem('chatPageVisited');
      if (chatPageVisited === 'true') {
        console.log('[MatchMakrChatList] Detected return from chat page, refreshing data');
        sessionStorage.removeItem('chatPageVisited');
        fetchConversations();
      }
    }
  }, [pathname, userId]);

  // Fetch conversations on navigation or user change
  useEffect(() => {
    console.log('[MatchMakrChatList] Main effect triggered. pathname:', pathname, 'userId:', userId);
    setLoading(true);
    setConversations([]);
    fetchConversations();
  }, [pathname, userId]);

  // Always fetch on component mount
  useEffect(() => {
    console.log('[MatchMakrChatList] Component mount effect triggered');
    if (userId) {
      setLoading(true);
      setConversations([]);
      fetchConversations();
    }
  }, [userId]);

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

export default MatchMakrChatList; 