import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const otherId = searchParams.get('otherId');
  const conversationId = searchParams.get('conversation_id');
  const aboutSingleId = searchParams.get('about_single_id');
  const clickedSingleId = searchParams.get('clicked_single_id');

  if (!userId || !otherId) {
    return NextResponse.json({ error: 'Missing userId or otherId' }, { status: 400 });
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== userId) {
    return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
  }

  try {
    let foundAboutSingleId = null;
    let foundClickedSingleId = null;
    let foundConversationId = null;

    if (conversationId) {
      // If conversation_id is provided, get context from the conversation
      console.log('Chat context: Using provided conversation_id:', conversationId);
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('about_single_id, clicked_single_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.log('Chat context: Conversation not found for ID:', conversationId);
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      foundAboutSingleId = conversation.about_single_id;
      foundClickedSingleId = conversation.clicked_single_id;
      foundConversationId = conversationId;
      console.log('Chat context: Found conversation with singles:', { foundAboutSingleId, foundClickedSingleId });
    } else if (aboutSingleId && clickedSingleId) {
      // If singles are provided, look for the specific conversation
      console.log('Chat context: Looking for conversation with specific singles:', { aboutSingleId, clickedSingleId });
      
      // Use the same logic as the unique constraint: LEAST and GREATEST
      const smallerId = userId < otherId ? userId : otherId;
      const largerId = userId < otherId ? otherId : userId;
      
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, about_single_id, clicked_single_id')
        .eq('initiator_matchmakr_id', smallerId)
        .eq('recipient_matchmakr_id', largerId)
        .eq('about_single_id', aboutSingleId)
        .eq('clicked_single_id', clickedSingleId)
        .maybeSingle();
      
      if (conversation) {
        foundConversationId = conversation.id;
        foundAboutSingleId = conversation.about_single_id;
        foundClickedSingleId = conversation.clicked_single_id;
        console.log('Chat context: Found conversation for specific singles:', { foundConversationId, foundAboutSingleId, foundClickedSingleId });
      } else {
        console.log('Chat context: No conversation found for specific singles - will create new conversation');
        // Don't set any conversation_id - let the message creation create a new conversation
        foundAboutSingleId = aboutSingleId;
        foundClickedSingleId = clickedSingleId;
      }
    } else {
      // Fallback: Look for any conversation between these users
      console.log('Chat context: No specific singles provided, looking for any conversation');
      
      // Use the same logic as the unique constraint: LEAST and GREATEST
      const smallerId = userId < otherId ? userId : otherId;
      const largerId = userId < otherId ? otherId : userId;
      
      // First, try to find any conversation between these users
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, about_single_id, clicked_single_id')
        .eq('initiator_matchmakr_id', smallerId)
        .eq('recipient_matchmakr_id', largerId)
        .maybeSingle();
      
      if (conversation) {
        foundConversationId = conversation.id;
        foundAboutSingleId = conversation.about_single_id;
        foundClickedSingleId = conversation.clicked_single_id;
        console.log('Chat context: Found any conversation:', { foundConversationId, foundAboutSingleId, foundClickedSingleId });
      } else {
        // If no conversation found, look for recent messages as fallback
        console.log('Chat context: No conversation found, looking for recent messages');
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('about_single_id, clicked_single_id, conversation_id')
          .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
          .not('about_single_id', 'is', null)
          .not('clicked_single_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.log('Chat context: Error fetching messages:', messagesError);
          return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        if (messages && messages.length > 0) {
          foundAboutSingleId = messages[0].about_single_id;
          foundClickedSingleId = messages[0].clicked_single_id;
          foundConversationId = messages[0].conversation_id;
          console.log('Chat context: Found recent message with singles:', { foundAboutSingleId, foundClickedSingleId, foundConversationId });
        } else {
          console.log('Chat context: No recent messages found with singles context');
        }
      }
    }

    // Get the current user's sponsored singles
    const { data: currentUserSingles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('sponsored_by_id', userId)
      .eq('user_type', 'SINGLE');

    // Get the other user's sponsored singles
    const { data: otherUserSingles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('sponsored_by_id', otherId)
      .eq('user_type', 'SINGLE');

    // Find the singles by ID
    let currentUserSingle = null;
    let otherUserSingle = null;
    if (foundAboutSingleId && currentUserSingles) {
      currentUserSingle = currentUserSingles.find(s => s.id === foundAboutSingleId);
    }
    if (foundClickedSingleId && otherUserSingles) {
      otherUserSingle = otherUserSingles.find(s => s.id === foundClickedSingleId);
    }

    // Fallbacks: if not found, use empty object
    const safeCurrentUserSingle = currentUserSingle ? {
      id: currentUserSingle.id,
      name: currentUserSingle.name,
      photo: currentUserSingle.photos && currentUserSingle.photos.length > 0 ? currentUserSingle.photos[0] : null
    } : { id: '', name: '', photo: null };
    const safeOtherUserSingle = otherUserSingle ? {
      id: otherUserSingle.id,
      name: otherUserSingle.name,
      photo: otherUserSingle.photos && otherUserSingle.photos.length > 0 ? otherUserSingle.photos[0] : null
    } : { id: '', name: '', photo: null };

    return NextResponse.json({
      success: true,
      currentUserSingle: safeCurrentUserSingle,
      otherUserSingle: safeOtherUserSingle,
      conversation_id: foundConversationId
    });

  } catch (error) {
    console.error('Error fetching chat context:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 