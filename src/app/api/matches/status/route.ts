import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const single_a_id = searchParams.get('single_a_id');
  const single_b_id = searchParams.get('single_b_id');
  const matchmakr_id = searchParams.get('matchmakr_id');

  if (!single_a_id || !single_b_id || !matchmakr_id) {
    return NextResponse.json({ error: 'Missing parameters', single_a_id, single_b_id, matchmakr_id }, { status: 400 });
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
    // No match yet, can approve
    return NextResponse.json({ success: true, status: 'can-approve' });
  }

  // Determine status
  if (match.matchmakr_a_approved && match.matchmakr_b_approved) {
    return NextResponse.json({ success: true, status: 'matched' });
  }
  if ((match.matchmakr_a_id === matchmakr_id && match.matchmakr_a_approved) ||
      (match.matchmakr_b_id === matchmakr_id && match.matchmakr_b_approved)) {
    // current matchmakr has approved, but not both
    return NextResponse.json({ success: true, status: 'pending' });
  }
  // else, current matchmakr has not approved
  return NextResponse.json({ success: true, status: 'can-approve' });
} 