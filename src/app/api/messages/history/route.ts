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

  // Only require userId/otherId if conversation_id is not present
  if (!conversationId && (!userId || !otherId)) {
    return NextResponse.json({ success: false, error: 'Missing userId or otherId' }, { status: 400 });
  }

  if (conversationId) {
    // Fetch by conversation_id
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, messages: data });
  }

  // If no conversation_id but singles are provided, filter by singles to ensure isolation
  if (aboutSingleId && clickedSingleId) {
    console.log('Message history: Filtering by singles for isolation:', { aboutSingleId, clickedSingleId });
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
      .eq('about_single_id', aboutSingleId)
      .eq('clicked_single_id', clickedSingleId)
      .order('created_at', { ascending: true });
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, messages: data });
  }

  // Fallback: fetch all messages between users (for backward compatibility)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, messages: data });
} 