import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const single_a_id = searchParams.get('single_a_id');
  const single_b_id = searchParams.get('single_b_id');

  if (!single_a_id || !single_b_id) {
    return NextResponse.json({ error: 'Missing parameters', single_a_id, single_b_id }, { status: 400 });
  }

  // Find match in either direction
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .or(`and(single_a_id.eq.${single_a_id},single_b_id.eq.${single_b_id}),and(single_a_id.eq.${single_b_id},single_b_id.eq.${single_a_id})`)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!match) {
    // No match yet
    return NextResponse.json({ success: true, canChat: false, reason: 'No match found' });
  }

  // Check if both matchmakrs have approved
  if (match.matchmakr_a_approved && match.matchmakr_b_approved) {
    return NextResponse.json({ success: true, canChat: true });
  } else {
    return NextResponse.json({ 
      success: true, 
      canChat: false, 
      reason: 'Both matchmakrs have not approved yet',
      matchmakr_a_approved: match.matchmakr_a_approved,
      matchmakr_b_approved: match.matchmakr_b_approved
    });
  }
} 