import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Sponsor invites another person to join Orbit as a Sponsor (JOIN invite). */
export async function POST(request: Request) {
  try {
    const { invitee_email, invitee_label } = await request.json();

    if (!invitee_email || typeof invitee_email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'You must be signed in to invite a sponsor.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Server misconfigured (missing Supabase env vars).' },
        { status: 500 }
      );
    }

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/sponsor-sponsor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        invitee_email: invitee_email.trim().toLowerCase(),
        invitee_label: typeof invitee_label === 'string' && invitee_label.trim()
          ? invitee_label.trim()
          : null,
      }),
    });

    const text = await fnRes.text();
    let json: { error?: string; message?: string; ok?: boolean; invite_id?: string; token?: string; email_sent?: boolean; [key: string]: unknown } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }

    if (!fnRes.ok) {
      return NextResponse.json(
        { error: json?.error || json?.message || 'Failed to send invite.' },
        { status: fnRes.status }
      );
    }

    return NextResponse.json(json ?? {});
  } catch (err) {
    console.error('[api/invite-sponsor-to-join] error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
