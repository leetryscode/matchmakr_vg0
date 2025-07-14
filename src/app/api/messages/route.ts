import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { sender_id, recipient_id, content, about_single_id, clicked_single_id } = body;

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== sender_id) {
    return NextResponse.json({ error: 'Sender mismatch' }, { status: 403 });
  }

  // Check sender and recipient user types
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('user_type, sponsored_by_id')
    .eq('id', sender_id)
    .single();
  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('user_type, sponsored_by_id')
    .eq('id', recipient_id)
    .single();
  if (!senderProfile || !recipientProfile) {
    return NextResponse.json({ error: 'Sender or recipient not found' }, { status: 404 });
  }

  // Allow matchmakr-to-matchmakr
  if (senderProfile.user_type === 'MATCHMAKR' && recipientProfile.user_type === 'MATCHMAKR') {
    // ok
  }
  // Allow matchmakr-to-their-sponsored-single
  else if (
    senderProfile.user_type === 'MATCHMAKR' &&
    recipientProfile.user_type === 'SINGLE' &&
    recipientProfile.sponsored_by_id === sender_id
  ) {
    // ok
  }
  // Allow single-to-their-sponsoring-matchmakr
  else if (
    senderProfile.user_type === 'SINGLE' &&
    recipientProfile.user_type === 'MATCHMAKR' &&
    senderProfile.sponsored_by_id === recipient_id
  ) {
    // ok
  }
  // Allow single-to-single if they have an approved match
  else if (
    senderProfile.user_type === 'SINGLE' &&
    recipientProfile.user_type === 'SINGLE'
  ) {
    console.log('DEBUG: single-to-single chat attempt', { sender_id, recipient_id, senderProfile, recipientProfile });
    // Check if they have an approved match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(single_a_id.eq.${sender_id},single_b_id.eq.${recipient_id}),and(single_a_id.eq.${recipient_id},single_b_id.eq.${sender_id})`)
      .single();
    
    if (matchError || !match || !match.matchmakr_a_approved || !match.matchmakr_b_approved) {
      console.log('DEBUG: single-to-single chat blocked', { match, matchError });
      return NextResponse.json({ error: 'Not allowed: singles can only chat if both matchmakrs have approved the match.' }, { status: 403 });
    }
  } else {
    console.log('DEBUG: chat blocked by fallback', { sender_id, recipient_id, senderProfile, recipientProfile });
    return NextResponse.json({ error: 'Not allowed: can only message your sponsor or sponsored single, other matchmakrs, or approved singles.' }, { status: 403 });
  }

  // Insert message
  let conversationId = null;
  if (senderProfile.user_type === 'MATCHMAKR' && recipientProfile.user_type === 'MATCHMAKR' && about_single_id && clicked_single_id) {
    // Use unordered pair for singles
    let aId = about_single_id;
    let bId = clicked_single_id;
    if (aId > bId) {
      const temp = aId;
      aId = bId;
      bId = temp;
    }
    // Try to find existing conversation using unordered singles
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('single_a_id', aId)
      .eq('single_b_id', bId)
      .maybeSingle();
    if (existingConv && existingConv.id) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation for this unordered pair
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          single_a_id: aId,
          single_b_id: bId,
          about_single_id,
          clicked_single_id,
          initiator_matchmakr_id: sender_id,
          recipient_matchmakr_id: recipient_id
        })
        .select('id')
        .single();
      if (convError || !newConv) {
        return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = newConv.id;
    }
  }
  const messageData: any = { sender_id, recipient_id, content };
  if (about_single_id) {
    messageData.about_single_id = about_single_id;
  }
  if (clicked_single_id) {
    messageData.clicked_single_id = clicked_single_id;
  }
  if (conversationId) {
    messageData.conversation_id = conversationId;
  }
  const { error: insertError } = await supabase
    .from('messages')
    .insert(messageData);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // --- Notification logic for matchmakr-to-matchmakr chat ---
  if (senderProfile.user_type === 'MATCHMAKR' && recipientProfile.user_type === 'MATCHMAKR') {
    // Find singles sponsored by each matchmakr
    const { data: singlesA } = await supabase
      .from('profiles')
      .select('id')
      .eq('sponsored_by_id', sender_id)
      .eq('user_type', 'SINGLE');
    const { data: singlesB } = await supabase
      .from('profiles')
      .select('id')
      .eq('sponsored_by_id', recipient_id)
      .eq('user_type', 'SINGLE');
    const mySingleId = singlesA && singlesA.length > 0 ? singlesA[0].id : null;
    const otherSingleId = singlesB && singlesB.length > 0 ? singlesB[0].id : null;
    // For each single, insert notification if not already present
    if (mySingleId) {
      const { data: existingA } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', mySingleId)
        .eq('type', 'matchmakr_chat')
        .eq('data->>matchmakr_id', sender_id)
        .eq('data->>other_matchmakr_id', recipient_id)
        .eq('data->>single_id', mySingleId)
        .maybeSingle();
      if (!existingA) {
        await supabase.from('notifications').insert([{
          user_id: mySingleId,
          type: 'matchmakr_chat',
          data: { matchmakr_id: sender_id, other_matchmakr_id: recipient_id, single_id: mySingleId }
        }]);
      }
    }
    if (otherSingleId) {
      const { data: existingB } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', otherSingleId)
        .eq('type', 'matchmakr_chat')
        .eq('data->>matchmakr_id', recipient_id)
        .eq('data->>other_matchmakr_id', sender_id)
        .eq('data->>single_id', otherSingleId)
        .maybeSingle();
      if (!existingB) {
        await supabase.from('notifications').insert([{
          user_id: otherSingleId,
          type: 'matchmakr_chat',
          data: { matchmakr_id: recipient_id, other_matchmakr_id: sender_id, single_id: otherSingleId }
        }]);
      }
    }
  }
  // --- End notification logic ---

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { sender_id, recipient_id, about_single_id, clicked_single_id } = body;

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== sender_id && user.id !== recipient_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete all messages between the two matchmakrs (in either direction)
  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${sender_id},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${sender_id})`);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Also delete the conversation row if about_single_id and clicked_single_id are provided
  if (about_single_id && clicked_single_id) {
    // Use the same logic as conversation creation: LEAST and GREATEST for matchmakr IDs
    const smallerId = sender_id < recipient_id ? sender_id : recipient_id;
    const largerId = sender_id < recipient_id ? recipient_id : sender_id;
    const { error: convDeleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('initiator_matchmakr_id', smallerId)
      .eq('recipient_matchmakr_id', largerId)
      .eq('about_single_id', about_single_id)
      .eq('clicked_single_id', clicked_single_id);
    if (convDeleteError) {
      return NextResponse.json({ error: convDeleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
} 