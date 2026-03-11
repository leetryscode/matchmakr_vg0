import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MEMBERSHIP_CAP = 3;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
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
      return NextResponse.json({ error: 'You must be signed in to join a community.' }, { status: 401 });
    }

    const admin = createServiceClient();

    const { data: community, error: communityError } = await admin
      .from('communities')
      .select('id, join_mode')
      .eq('id', communityId)
      .maybeSingle();

    if (communityError) {
      console.error('[api/communities/join] community fetch error:', communityError);
      return NextResponse.json({ error: 'Failed to fetch community.' }, { status: 500 });
    }
    if (!community) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    if (community.join_mode === 'sponsor_invite_only') {
      let body: { inviteToken?: string } = {};
      try {
        body = await request.json();
      } catch {
        /* empty body ok */
      }
      const inviteToken = body?.inviteToken;
      if (!inviteToken || typeof inviteToken !== 'string' || !inviteToken.trim()) {
        return NextResponse.json(
          { error: 'This community is invite-only. You must be invited by a sponsor to join.' },
          { status: 403 }
        );
      }

      const { data: invite, error: inviteError } = await admin
        .from('invites')
        .select('id, status, community_id')
        .eq('token', inviteToken.trim())
        .maybeSingle();

      if (inviteError || !invite) {
        return NextResponse.json(
          { error: 'This community is invite-only. You must be invited by a sponsor to join.' },
          { status: 403 }
        );
      }
      if (invite.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'This invite is no longer valid.' },
          { status: 403 }
        );
      }

      if (!invite.community_id || invite.community_id !== communityId) {
        return NextResponse.json(
          { error: 'This community is invite-only. You must be invited by a sponsor to join.' },
          { status: 403 }
        );
      }
    }

    const { data: existingMembership } = await admin
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ joined: true, already_member: true });
    }

    const { count, error: countError } = await admin
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id);

    if (countError) {
      console.error('[api/communities/join] count error:', countError);
      return NextResponse.json({ error: 'Failed to check membership.' }, { status: 500 });
    }
    if ((count ?? 0) >= MEMBERSHIP_CAP) {
      return NextResponse.json(
        { error: `You can only belong to ${MEMBERSHIP_CAP} communities. Leave one to join another.` },
        { status: 409 }
      );
    }

    const { error: insertError } = await admin
      .from('community_members')
      .insert({
        community_id: communityId,
        profile_id: user.id,
        role: 'member',
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ joined: true, already_member: true });
      }
      console.error('[api/communities/join] insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ joined: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SUPABASE_SERVICE_ROLE_KEY not set' || msg === 'NEXT_PUBLIC_SUPABASE_URL not set') {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    console.error('[api/communities/join] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
