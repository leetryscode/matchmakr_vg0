import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { single_email, sponsor_label } = await request.json();

    if (!single_email || typeof single_email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'You must be signed in to invite a single.' }, { status: 401 });
    }

    // Forward JWT explicitly to the Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Server misconfigured (missing Supabase env vars).' },
        { status: 500 }
      );
    }

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/sponsor-single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        single_email,
        sponsor_label: typeof sponsor_label === 'string' ? sponsor_label.trim() : null,
      }),
    });

    const text = await fnRes.text();
    let json: { error?: string; message?: string; [key: string]: unknown } | null = null;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!fnRes.ok) {
      return NextResponse.json(
        { error: json?.error || json?.message || 'Failed to send invite.' },
        { status: fnRes.status }
      );
    }

    return NextResponse.json(json ?? {});
  } catch (err) {
    console.error('[api/invite-single] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
