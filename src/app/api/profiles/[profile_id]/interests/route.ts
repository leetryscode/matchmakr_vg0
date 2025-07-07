import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { profile_id: string } }) {
  const supabase = createClient();
  const { profile_id } = params;
  // Join profile_interests and interests
  const { data, error } = await supabase
    .from('profile_interests')
    .select('interest_id, interests(name)')
    .eq('profile_id', profile_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Return as array of { id, name }
  const interests = data.map((row: any) => ({ id: row.interest_id, name: row.interests.name }));
  return NextResponse.json({ interests });
}

export async function POST(req: NextRequest, { params }: { params: { profile_id: string } }) {
  const supabase = createClient();
  const { profile_id } = params;
  const { interestIds } = await req.json();
  if (!Array.isArray(interestIds)) {
    return NextResponse.json({ error: 'interestIds must be an array' }, { status: 400 });
  }
  // Remove all existing interests for this profile
  const { error: delError } = await supabase
    .from('profile_interests')
    .delete()
    .eq('profile_id', profile_id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  // Insert new interests
  if (interestIds.length > 0) {
    const inserts = interestIds.map((interest_id: number) => ({ profile_id, interest_id }));
    const { error: insError } = await supabase
      .from('profile_interests')
      .insert(inserts);
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 