import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const JOIN_MODES = ['open', 'sponsor_invite_only'] as const;
const NAME_MAX_LENGTH = 120;
const BROWSE_LIMIT_MIN = 1;
const BROWSE_LIMIT_MAX = 100;
const BROWSE_LIMIT_DEFAULT = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = BROWSE_LIMIT_DEFAULT;
    if (limitParam !== null && limitParam !== '') {
      const parsed = parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < BROWSE_LIMIT_MIN || parsed > BROWSE_LIMIT_MAX) {
        return NextResponse.json(
          { error: `limit must be between ${BROWSE_LIMIT_MIN} and ${BROWSE_LIMIT_MAX}.` },
          { status: 400 }
        );
      }
      limit = parsed;
    }

    let offset = 0;
    if (offsetParam !== null && offsetParam !== '') {
      const parsed = parseInt(offsetParam, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json({ error: 'offset must be a non-negative integer.' }, { status: 400 });
      }
      offset = parsed;
    }

    const admin = createServiceClient();
    const { data: rows, error } = await admin
      .from('communities')
      .select('id, name, description, join_mode, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[api/communities] browse query error:', error);
      return NextResponse.json({ error: 'Failed to fetch communities.' }, { status: 500 });
    }

    const communities = (rows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      join_mode: c.join_mode,
      created_at: c.created_at,
    }));

    return NextResponse.json({ communities });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SUPABASE_SERVICE_ROLE_KEY not set' || msg === 'NEXT_PUBLIC_SUPABASE_URL not set') {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    console.error('[api/communities] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}

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
