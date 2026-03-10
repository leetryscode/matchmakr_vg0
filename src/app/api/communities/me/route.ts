import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** List communities for the current profile. Sorted by joined_at descending (newest first). */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to view your communities.' }, { status: 401 });
    }

    const admin = createServiceClient();

    const { data: memberships, error: membersError } = await admin
      .from('community_members')
      .select('community_id, role, joined_at')
      .eq('profile_id', user.id)
      .order('joined_at', { ascending: false });

    if (membersError) {
      console.error('[api/communities/me] memberships query error:', membersError);
      return NextResponse.json({ error: 'Failed to fetch communities.' }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ communities: [] });
    }

    const communityIds = memberships.map((m) => m.community_id);
    const { data: communityRows, error: communitiesError } = await admin
      .from('communities')
      .select('id, name, description, join_mode')
      .in('id', communityIds);

    if (communitiesError) {
      console.error('[api/communities/me] communities query error:', communitiesError);
      return NextResponse.json({ error: 'Failed to fetch communities.' }, { status: 500 });
    }

    const communityById = new Map(
      (communityRows ?? []).map((c) => [c.id, c])
    );

    const communities = memberships.map((m) => {
      const c = communityById.get(m.community_id);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        join_mode: c.join_mode,
        role: m.role,
        joined_at: m.joined_at,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ communities });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SUPABASE_SERVICE_ROLE_KEY not set' || msg === 'NEXT_PUBLIC_SUPABASE_URL not set') {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    console.error('[api/communities/me] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
