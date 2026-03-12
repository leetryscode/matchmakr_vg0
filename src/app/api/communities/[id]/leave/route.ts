import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params;
    if (!communityId || !UUID_REGEX.test(communityId)) {
      return NextResponse.json({ error: 'Invalid community id.' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to leave a community.' }, { status: 401 });
    }

    const admin = createServiceClient();
    const { data: membership, error: membershipError } = await admin
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('[api/communities/leave] membership fetch error:', membershipError);
      return NextResponse.json({ error: 'Failed to check membership.' }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this community.' }, { status: 404 });
    }

    if (membership.role === 'founder') {
      return NextResponse.json({ error: 'Founders cannot leave their own community.' }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from('community_members')
      .delete()
      .eq('id', membership.id);

    if (deleteError) {
      console.error('[api/communities/leave] delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to leave community.' }, { status: 500 });
    }

    return NextResponse.json({ left: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SUPABASE_SERVICE_ROLE_KEY not set' || msg === 'NEXT_PUBLIC_SUPABASE_URL not set') {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    console.error('[api/communities/leave] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
