import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { single_a_id, single_b_id, matchmakr_id } = body;

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.id !== matchmakr_id) {
    return NextResponse.json({ error: 'Matchmakr mismatch' }, { status: 403 });
  }

  // Fetch singles' profiles to get their matchmakrs
  const { data: singles, error: singlesError } = await supabase
    .from('profiles')
    .select('id, sponsored_by_id')
    .in('id', [single_a_id, single_b_id]);
  if (singlesError || !singles || singles.length !== 2) {
    return NextResponse.json({ error: 'Singles not found' }, { status: 404 });
  }
  const [singleA, singleB] = singles[0].id === single_a_id ? [singles[0], singles[1]] : [singles[1], singles[0]];
  const matchmakrA = singleA.sponsored_by_id;
  const matchmakrB = singleB.sponsored_by_id;

  // Find or create match
  let { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .or(`and(single_a_id.eq.${single_a_id},single_b_id.eq.${single_b_id}),and(single_a_id.eq.${single_b_id},single_b_id.eq.${single_a_id})`)
    .single();

  if (!match) {
    // Create new match with the approving matchmakr's approval
    const isA = matchmakr_id === matchmakrA;
    const insertData = {
      single_a_id,
      single_b_id,
      matchmakr_a_id: matchmakrA,
      matchmakr_b_id: matchmakrB,
      matchmakr_a_approved: isA ? true : false,
      matchmakr_b_approved: isA ? false : true,
      approved_at: null
    };
    const { data: newMatch, error: insertError } = await supabase
      .from('matches')
      .insert([insertData])
      .select('*')
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    match = newMatch;
  } else {
    // Update approval
    const updateFields: any = {};
    if (String(matchmakr_id) === String(match.matchmakr_a_id) && !match.matchmakr_a_approved) {
      updateFields.matchmakr_a_approved = true;
    }
    if (String(matchmakr_id) === String(match.matchmakr_b_id) && !match.matchmakr_b_approved) {
      updateFields.matchmakr_b_approved = true;
    }
    // If both approved, set approved_at
    const bothApproved = (updateFields.matchmakr_a_approved || match.matchmakr_a_approved) && (updateFields.matchmakr_b_approved || match.matchmakr_b_approved);
    if (bothApproved && !match.approved_at) updateFields.approved_at = new Date().toISOString();
    if (Object.keys(updateFields).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('matches')
        .update(updateFields)
        .eq('id', match.id)
        .select('*')
        .single();
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      match = updated;
    }
  }
  // Always return the same structure
  return NextResponse.json({ success: true, match });
} 