import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureNudgeInviteSponsor } from '@/lib/notifications/nudge-invite-sponsor';
import { ensureNudgeInviteSingle } from '@/lib/notifications/nudge-invite-single';

/**
 * POST /api/notifications/ensure-nudges
 * Ensures persistent nudges are created when conditions are unmet.
 * Called from AuthProvider on app open (fire-and-forget).
 *
 * Body: optional/ignored. All data derived server-side from session + profile.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch profile server-side — never trust client body
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, sponsored_by_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.user_type) {
      // No profile or vendor — check vendor_profiles; if neither, skip nudges
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!vendorProfile) {
        return NextResponse.json({ success: true });
      }
      // Vendor: no nudge
      return NextResponse.json({ success: true });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const userType = profile.user_type;
    const sponsoredById = profile.sponsored_by_id ?? null;

    if (userType === 'SINGLE') {
      await ensureNudgeInviteSponsor(userId, sponsoredById, supabaseUrl, serviceRoleKey);
    } else if (userType === 'MATCHMAKR') {
      await ensureNudgeInviteSingle(userId, supabaseUrl, serviceRoleKey);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[EnsureNudges] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
