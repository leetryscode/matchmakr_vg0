import { createClient } from '@/lib/supabase/server';
import MatchMakrChatListClient from './MatchMakrChatListClient';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

const MatchMakrChatList = async ({ userId, currentUserName, currentUserProfilePic }: MatchMakrChatListProps) => {
  const supabase = createClient();

  // Fetch conversations directly from Supabase
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      initiator_matchmakr_id,
      recipient_matchmakr_id,
      about_single_id,
      clicked_single_id,
      status,
      match_status,
      created_at,
      initiator:initiator_matchmakr_id (id, name, photos),
      recipient:recipient_matchmakr_id (id, name, photos),
      about_single:about_single_id (id, name, photos),
      clicked_single:clicked_single_id (id, name, photos)
    `)
    .or(`initiator_matchmakr_id.eq.${userId},recipient_matchmakr_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return <MatchMakrChatListClient 
      userId={userId} 
      conversations={[]} 
      otherProfiles={{}} 
      sponsoredSingles={[]} 
      currentUserName={currentUserName || ''} 
      currentUserProfilePic={currentUserProfilePic || null} 
    />;
  }

  // Get unread counts and last messages for each conversation
  const conversationsWithDetails = await Promise.all((conversations || []).map(async (conv) => {
    const otherUserId = conv.initiator_matchmakr_id === userId ? conv.recipient_matchmakr_id : conv.initiator_matchmakr_id;
    
    // Get unread count for this specific conversation
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', userId)
      .eq('conversation_id', conv.id)
      .eq('read', false);

    // Get last message for this specific conversation
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      ...conv,
      unreadCount: unreadCount || 0,
      lastMessage: lastMessage?.[0] || null
    };
  }));

  // Format singles' photos for frontend
  const formatted = conversationsWithDetails.map(conv => {
    // about_single and clicked_single may be arrays or objects or null
    let about: any = conv.about_single;
    if (Array.isArray(about)) about = about[0] || null;
    if (about && typeof about !== 'object') about = null;
    let clicked: any = conv.clicked_single;
    if (Array.isArray(clicked)) clicked = clicked[0] || null;
    if (clicked && typeof clicked !== 'object') clicked = null;
    return {
      ...conv,
      initiator: conv.initiator || null,
      recipient: conv.recipient || null,
      about_single: about && typeof about === 'object' && !Array.isArray(about) ? {
        id: about.id,
        name: about.name,
        photo: Array.isArray(about.photos) && about.photos.length > 0 ? about.photos[0] : null
      } : null,
      clicked_single: clicked && typeof clicked === 'object' && !Array.isArray(clicked) ? {
        id: clicked.id,
        name: clicked.name,
        photo: Array.isArray(clicked.photos) && clicked.photos.length > 0 ? clicked.photos[0] : null
      } : null
    };
  });

  // Transform conversations to match the expected format for MatchMakrChatListClient
  const transformedConversations = formatted.map((conv: any) => ({
    id: conv.id,
    sender_id: conv.initiator_matchmakr_id,
    recipient_id: conv.recipient_matchmakr_id,
    content: conv.lastMessage?.content || '',
    created_at: conv.lastMessage?.created_at || conv.created_at,
    about_single_id: conv.about_single_id,
    clicked_single_id: conv.clicked_single_id,
    unreadCount: conv.unreadCount || 0,
    lastMessage: conv.lastMessage,
    // Add conversation context
    conversation: {
      id: conv.id,
      about_single: conv.about_single,
      clicked_single: conv.clicked_single,
      initiator: conv.initiator,
      recipient: conv.recipient,
      status: conv.status,
      match_status: conv.match_status
    }
  }));

  // Build otherProfiles from conversation data
  const otherProfiles: Record<string, any> = {};
  formatted.forEach((conv: any) => {
    const otherUserId = conv.initiator_matchmakr_id === userId ? conv.recipient_matchmakr_id : conv.initiator_matchmakr_id;
    const otherUser = conv.initiator_matchmakr_id === userId ? conv.recipient : conv.initiator;
    if (otherUser) {
      otherProfiles[otherUserId] = {
        id: otherUser.id,
        name: otherUser.name,
        profile_pic_url: Array.isArray(otherUser.photos) && otherUser.photos.length > 0 ? otherUser.photos[0] : null,
      };
    }
  });

  return <MatchMakrChatListClient 
    userId={userId} 
    conversations={transformedConversations} 
    otherProfiles={otherProfiles} 
    sponsoredSingles={[]} 
    currentUserName={currentUserName || ''} 
    currentUserProfilePic={currentUserProfilePic || null} 
  />;
};

export default MatchMakrChatList; 