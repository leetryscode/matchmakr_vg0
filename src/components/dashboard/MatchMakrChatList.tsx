import { createClient } from '@/lib/supabase/server';
import MatchMakrChatListClient from './MatchMakrChatListClient';

interface MatchMakrChatListProps {
  userId: string;
  sponsoredSingles?: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName?: string;
  currentUserProfilePic?: string | null;
}

// Helper to get the other participant's id from a message
function getOtherParticipantId(message: any, userId: string) {
  return message.sender_id === userId ? message.recipient_id : message.sender_id;
}

const MatchMakrChatList = async ({ userId, currentUserName, currentUserProfilePic }: MatchMakrChatListProps) => {
  const supabase = createClient();

  // Fetch all profiles that are MATCHMAKRs except the current user
  const { data: matchmakrProfiles } = await supabase
    .from('profiles')
    .select('id, name, photos')
    .eq('user_type', 'MATCHMAKR')
    .neq('id', userId);

  const matchmakrIds = matchmakrProfiles ? matchmakrProfiles.map((p: any) => p.id) : [];

  // Fetch all messages where user is sender or recipient and the other participant is a MATCHMAKR
  let messages: any[] = [];
  if (matchmakrIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or([
        ...matchmakrIds.map(id => `sender_id.eq.${userId},recipient_id.eq.${id}`),
        ...matchmakrIds.map(id => `sender_id.eq.${id},recipient_id.eq.${userId}`)
      ].join(','))
      .order('created_at', { ascending: false });
    messages = msgs || [];
  }

  // Filter: Only include messages where the current user is either sender or recipient, and the other participant is a current MatchMakr (not self)
  const validMessages = messages.filter(msg => {
    const otherId = getOtherParticipantId(msg, userId);
    return (msg.sender_id === userId || msg.recipient_id === userId) &&
      matchmakrIds.includes(otherId) &&
      otherId !== userId;
  });

  // Group by other matchmakr id, only keep the latest message per conversation
  const conversationsMap = new Map();
  if (validMessages) {
    for (const msg of validMessages) {
      const otherId = getOtherParticipantId(msg, userId);
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, msg);
      }
    }
  }
  const conversations = Array.from(conversationsMap.values());

  // Build otherProfiles from matchmakrProfiles
  let otherProfiles: Record<string, any> = {};
  if (matchmakrProfiles) {
    for (const p of matchmakrProfiles) {
      otherProfiles[p.id] = {
        id: p.id,
        name: p.name,
        profile_pic_url: p.photos && p.photos.length > 0 ? p.photos[0] : null,
      };
    }
  }

  return <MatchMakrChatListClient userId={userId} conversations={conversations} otherProfiles={otherProfiles} sponsoredSingles={[]} currentUserName={currentUserName || ''} currentUserProfilePic={currentUserProfilePic || null} />;
};

export default MatchMakrChatList; 