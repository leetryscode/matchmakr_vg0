import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Use the optimized view instead of complex joins
    const { data: conversations, error } = await supabase
      .from('conversation_summaries')
      .select(`
        *,
        initiator:initiator_matchmakr_id (id, name, photos, user_type),
        recipient:recipient_matchmakr_id (id, name, photos, user_type),
        about_single:about_single_id (id, name, photos),
        clicked_single:clicked_single_id (id, name, photos)
      `)
      .or(`initiator_matchmakr_id.eq.${userId},recipient_matchmakr_id.eq.${userId}`)
      .order('last_message_time', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Filter conversations to only include MatchMakr-to-MatchMakr
    const matchmakrConversations = (conversations || []).filter(conv => {
      const initiator = Array.isArray(conv.initiator) ? conv.initiator[0] : conv.initiator;
      const recipient = Array.isArray(conv.recipient) ? conv.recipient[0] : conv.recipient;
      return initiator?.user_type === 'MATCHMAKR' && recipient?.user_type === 'MATCHMAKR';
    });

    // Format the data for frontend
    const formatted = matchmakrConversations.map(conv => {
      let about: any = conv.about_single;
      if (Array.isArray(about)) about = about[0] || null;
      if (about && typeof about !== 'object') about = null;
      
      let clicked: any = conv.clicked_single;
      if (Array.isArray(clicked)) clicked = clicked[0] || null;
      if (clicked && typeof clicked !== 'object') clicked = null;

      return {
        id: conv.id,
        sender_id: conv.initiator_matchmakr_id,
        recipient_id: conv.recipient_matchmakr_id,
        content: conv.last_message_content || '',
        created_at: conv.last_message_time || conv.created_at,
        about_single_id: conv.about_single_id,
        clicked_single_id: conv.clicked_single_id,
        unreadCount: conv.unread_count || 0,
        lastMessage: conv.last_message_content ? {
          content: conv.last_message_content,
          created_at: conv.last_message_time
        } : null,
        conversation: {
          id: conv.id,
          about_single: about && typeof about === 'object' && !Array.isArray(about) ? {
            id: about.id,
            name: about.name,
            photo: Array.isArray(about.photos) && about.photos.length > 0 ? about.photos[0] : null
          } : null,
          clicked_single: clicked && typeof clicked === 'object' && !Array.isArray(clicked) ? {
            id: clicked.id,
            name: clicked.name,
            photo: Array.isArray(clicked.photos) && clicked.photos.length > 0 ? clicked.photos[0] : null
          } : null,
          initiator: conv.initiator || null,
          recipient: conv.recipient || null,
          status: conv.status,
          match_status: conv.match_status
        }
      };
    });

    return NextResponse.json({ 
      success: true, 
      conversations: formatted 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 