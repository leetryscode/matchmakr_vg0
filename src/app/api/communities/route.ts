import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const JOIN_MODES = ['open', 'sponsor_invite_only'] as const;
const NAME_MAX_LENGTH = 120;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to create a community.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }
    if (profile.user_type !== 'MATCHMAKR') {
      return NextResponse.json({ error: 'Only sponsors can create communities.' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { name, description, join_mode } = body as Record<string, unknown>;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > NAME_MAX_LENGTH) {
      return NextResponse.json({ error: `name must be ${NAME_MAX_LENGTH} characters or fewer.` }, { status: 400 });
    }
    if (!join_mode || typeof join_mode !== 'string' || !JOIN_MODES.includes(join_mode as (typeof JOIN_MODES)[number])) {
      return NextResponse.json({ error: 'join_mode must be "open" or "sponsor_invite_only".' }, { status: 400 });
    }

    const insertData = {
      name: trimmedName,
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      created_by: user.id,
      join_mode: join_mode as (typeof JOIN_MODES)[number],
    };

    const admin = createServiceClient();
    const { data: community, error: insertError } = await admin
      .from('communities')
      .insert(insertData)
      .select('id, name, description, join_mode, created_at')
      .single();

    if (insertError) {
      console.error('[api/communities] insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(community, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SUPABASE_SERVICE_ROLE_KEY not set' || msg === 'NEXT_PUBLIC_SUPABASE_URL not set') {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    console.error('[api/communities] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
