import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Fetch conversations where user is initiator or recipient
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
      initiator:initiator_matchmakr_id (id, name, profile_pic_url),
      recipient:recipient_matchmakr_id (id, name, profile_pic_url),
      about_single:about_single_id (id, name, photos),
      clicked_single:clicked_single_id (id, name, photos)
    `)
    .or(`initiator_matchmakr_id.eq.${userId},recipient_matchmakr_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unread counts and last messages for each conversation
  const conversationsWithDetails = await Promise.all((conversations || []).map(async (conv) => {
    const otherUserId = conv.initiator_matchmakr_id === userId ? conv.recipient_matchmakr_id : conv.initiator_matchmakr_id;
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', userId)
      .eq('read', false);

    // Get last message
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('content, created_at')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
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

  return NextResponse.json({ success: true, conversations: formatted });
} 