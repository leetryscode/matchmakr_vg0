import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  let userId = searchParams.get('userId');
  let otherId = searchParams.get('otherId');
  const conversationId = searchParams.get('conversation_id');
  const aboutSingleId = searchParams.get('about_single_id');
  const clickedSingleId = searchParams.get('clicked_single_id');

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (userId && user.id !== userId) {
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
        .select('about_single_id, clicked_single_id, initiator_matchmakr_id, recipient_matchmakr_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.log('Chat context: Conversation not found for ID:', conversationId);
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      foundAboutSingleId = conversation.about_single_id;
      foundClickedSingleId = conversation.clicked_single_id;
      foundConversationId = conversationId;
      // Set userId and otherId from the conversation
      const initiatorId = conversation.initiator_matchmakr_id;
      const recipientId = conversation.recipient_matchmakr_id;
      // Use the current user as userId if possible, otherwise fallback
      let resolvedUserId = userId || initiatorId;
      let resolvedOtherId = otherId || recipientId;
      userId = resolvedUserId;
      otherId = resolvedOtherId;
      console.log('Chat context: Found conversation with singles:', { foundAboutSingleId, foundClickedSingleId, initiatorId, recipientId });
    } else if (aboutSingleId && clickedSingleId) {
      // If singles are provided, look for the specific conversation
      console.log('Chat context: Looking for conversation with specific singles:', { aboutSingleId, clickedSingleId });
      // Always use the lower/higher of the two single IDs for uniqueness
      let aId = aboutSingleId;
      let bId = clickedSingleId;
      if (aId && bId && aId > bId) {
        const temp = aId;
        aId = bId;
        bId = temp;
      }
      // Try to find existing conversation using unordered singles
      let conversation = null;
      if (aId && bId) {
        const { data } = await supabase
          .from('conversations')
          .select('id, single_a_id, single_b_id, about_single_id, clicked_single_id')
          .eq('single_a_id', aId)
          .eq('single_b_id', bId)
          .maybeSingle();
        conversation = data;
      }
      if (!conversation && aId && bId) {
        // Create new conversation for this unordered pair
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            single_a_id: aId,
            single_b_id: bId,
            about_single_id: aboutSingleId,
            clicked_single_id: clickedSingleId,
            initiator_matchmakr_id: userId,
            recipient_matchmakr_id: otherId,
            status: 'ACTIVE'
          })
          .select('id')
          .single();
        if (createError) {
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }
        conversation = newConv;
      }
      if (conversation) {
        foundConversationId = conversation.id;
        foundAboutSingleId = conversation.about_single_id;
        foundClickedSingleId = conversation.clicked_single_id;
        console.log('Chat context: Found conversation for specific singles:', { foundConversationId, foundAboutSingleId, foundClickedSingleId });
      } else {
        console.log('Chat context: No conversation found for specific singles - will create new conversation');
        // Create a new conversation for these singles
        const smallerId = (userId ?? '') < (otherId ?? '') ? (userId ?? '') : (otherId ?? '');
        const largerId = (userId ?? '') < (otherId ?? '') ? (otherId ?? '') : (userId ?? '');
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            initiator_matchmakr_id: smallerId,
            recipient_matchmakr_id: largerId,
            about_single_id: aboutSingleId,
            clicked_single_id: clickedSingleId,
            status: 'ACTIVE'
          })
          .select('id')
          .single();
        if (createError) {
          console.log('Chat context: Error creating conversation:', createError);
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }
        foundConversationId = newConversation.id;
        foundAboutSingleId = aboutSingleId;
        foundClickedSingleId = clickedSingleId;
        console.log('Chat context: Created new conversation:', { foundConversationId, foundAboutSingleId, foundClickedSingleId });
      }
    } else {
      // Fallback: Look for any conversation between these users
      console.log('Chat context: No specific singles provided, looking for any conversation');
      const smallerId = (userId ?? '') < (otherId ?? '') ? (userId ?? '') : (otherId ?? '');
      const largerId = (userId ?? '') < (otherId ?? '') ? (otherId ?? '') : (userId ?? '');
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
          .or(`and(sender_id.eq.${userId ?? ''},recipient_id.eq.${otherId ?? ''}),and(sender_id.eq.${otherId ?? ''},recipient_id.eq.${userId ?? ''})`)
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
    // After all extraction logic, check for missing userId/otherId
    if (!userId || !otherId) {
      return NextResponse.json({ error: 'Missing userId or otherId' }, { status: 400 });
    }
    // Get the current user's sponsored singles
    const { data: currentUserSingles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('sponsored_by_id', userId ?? '')
      .eq('user_type', 'SINGLE');
    // Get the other user's sponsored singles
    const { data: otherUserSingles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('sponsored_by_id', otherId ?? '')
      .eq('user_type', 'SINGLE');

    // Find the singles by ID
    let currentUserSingle = null;
    let otherUserSingle = null;
    if (foundAboutSingleId) {
      currentUserSingle = (currentUserSingles || []).find(s => s.id === foundAboutSingleId) || (otherUserSingles || []).find(s => s.id === foundAboutSingleId);
    }
    if (foundClickedSingleId) {
      otherUserSingle = (otherUserSingles || []).find(s => s.id === foundClickedSingleId) || (currentUserSingles || []).find(s => s.id === foundClickedSingleId);
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

    // Fetch MatchMakr profiles
    const { data: initiatorProfile } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('id', userId)
      .single();
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('id', otherId)
      .single();

    const safeInitiatorProfile = initiatorProfile ? {
      id: initiatorProfile.id,
      name: initiatorProfile.name,
      photo: initiatorProfile.photos && initiatorProfile.photos.length > 0 ? initiatorProfile.photos[0] : null
    } : { id: '', name: '', photo: null };
    const safeRecipientProfile = recipientProfile ? {
      id: recipientProfile.id,
      name: recipientProfile.name,
      photo: recipientProfile.photos && recipientProfile.photos.length > 0 ? recipientProfile.photos[0] : null
    } : { id: '', name: '', photo: null };

    return NextResponse.json({
      success: true,
      currentUserSingle: safeCurrentUserSingle,
      otherUserSingle: safeOtherUserSingle,
      conversation_id: foundConversationId,
      initiatorProfile: safeInitiatorProfile,
      recipientProfile: safeRecipientProfile
    });

  } catch (error) {
    console.error('Error fetching chat context:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 