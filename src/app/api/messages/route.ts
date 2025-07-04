import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { sender_id, recipient_id, content } = body;

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== sender_id) {
    return NextResponse.json({ error: 'Sender mismatch' }, { status: 403 });
  }

  // Check sender is a matchmakr
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', sender_id)
    .single();
  if (!senderProfile || senderProfile.user_type !== 'MATCHMAKR') {
    return NextResponse.json({ error: 'Only matchmakrs can send messages' }, { status: 403 });
  }

  // Insert message
  const { error: insertError } = await supabase
    .from('messages')
    .insert({ sender_id, recipient_id, content });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { sender_id, recipient_id } = body;

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

  return NextResponse.json({ success: true });
} 