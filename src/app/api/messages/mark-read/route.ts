import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { userId, otherId } = await req.json();

  if (!userId || !otherId) {
    return NextResponse.json({ success: false, error: 'Missing userId or otherId' }, { status: 400 });
  }

  // Mark all messages as read where recipient is the current user and sender is the other user
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', otherId)
    .eq('read', false);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 