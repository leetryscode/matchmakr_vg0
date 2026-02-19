import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/** Fetch invite metadata by token. Public endpoint (anon); uses service role to bypass RLS. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select(`
      id,
      invitee_email,
      invitee_label,
      target_user_type,
      status,
      inviter_id
    `)
    .eq('token', token)
    .maybeSingle();

  if (inviteError) {
    console.error('[api/invite] fetch error:', inviteError);
    return NextResponse.json({ error: 'Failed to fetch invite.' }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Only PENDING invites allow InviteGate Continue; any other status returns 410
  if (invite.status !== 'PENDING') {
    return NextResponse.json({
      error: 'This invite is no longer valid.',
      code: 'EXPIRED_OR_INVALID',
      status: invite.status,
    }, { status: 410 });
  }

  // Fetch inviter name and community
  const { data: inviterProfile } = await supabaseAdmin
    .from('profiles')
    .select('name, orbit_community_slug')
    .eq('id', invite.inviter_id)
    .single();

  const invitorName = inviterProfile?.name ?? 'Someone';
  const communitySlug = inviterProfile?.orbit_community_slug ?? null;

  // Map DB target_user_type to UI role
  const invitedRole = invite.target_user_type === 'MATCHMAKR' ? 'SPONSOR' : 'SINGLE';

  return NextResponse.json({
    invited_role: invitedRole,
    invitor_name: invitorName,
    invitee_name: invite.invitee_label ?? null,
    invitee_email: invite.invitee_email ?? null,
    community_id: null,
    community_name: communitySlug,
    community_slug: communitySlug,
    status: invite.status,
  });
}
