import { createClient } from '@/lib/supabase/server';
import MatchMakrChatListClient from './MatchMakrChatListClient';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

// Helper to get the other matchmakr's id from a message
function getOtherMatchmakrId(message: any, userId: string) {
  return message.sender_id === userId ? message.recipient_id : message.sender_id;
}

const MatchMakrChatList = async ({ userId, sponsoredSingles, currentUserName, currentUserProfilePic }: MatchMakrChatListProps) => {
  const supabase = createClient();

  // Fetch all messages where user is sender or recipient
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  // Group by other matchmakr id, only keep the latest message per conversation
  const conversationsMap = new Map();
  if (messages) {
    for (const msg of messages) {
      const otherId = getOtherMatchmakrId(msg, userId);
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, msg);
      }
    }
  }
  const conversations = Array.from(conversationsMap.values());

  // Fetch profiles for all other matchmakrs
  const otherIds = conversations.map(msg => getOtherMatchmakrId(msg, userId));
  let otherProfiles: Record<string, any> = {};
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', otherIds);
    if (profiles) {
      for (const p of profiles) {
        otherProfiles[p.id] = {
          id: p.id,
          name: p.name,
          profile_pic_url: p.photos && p.photos.length > 0 ? p.photos[0] : null,
        };
      }
    }
  }

  return <MatchMakrChatListClient userId={userId} conversations={conversations} otherProfiles={otherProfiles} sponsoredSingles={sponsoredSingles || []} currentUserName={currentUserName || ''} currentUserProfilePic={currentUserProfilePic || null} />;
};

export default MatchMakrChatList; 