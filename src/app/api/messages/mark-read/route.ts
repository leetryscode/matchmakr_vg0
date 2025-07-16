import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { userId, otherId, conversationId } = await req.json();

  if (!userId || !otherId) {
    return NextResponse.json({ success: false, error: 'Missing userId or otherId' }, { status: 400 });
  }

  // Build the query to mark messages as read
  let query = supabase
    .from('messages')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', otherId)
    .eq('read', false);

  // If conversationId is provided, filter by conversation (for MatchMakr-to-MatchMakr chats)
  if (conversationId) {
    query = query.eq('conversation_id', conversationId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 