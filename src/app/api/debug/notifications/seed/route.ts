import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// DEV-only route to seed example notifications
export async function POST(req: NextRequest) {
  // Production safety: return 404 in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Use server client to check authentication (requires user context)
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate service role key exists
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ 
      error: 'Server configuration error: Service role key not configured' 
    }, { status: 500 });
  }

  // Create service role client for INSERT (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Sponsor-related types: only valid for Singles with a sponsor
  const SPONSOR_NOTIF_TYPES = new Set(['matchmakr_chat', 'sponsor_updated_profile', 'sponsor_logged_in']);

  // Get notification type from query params, otherwise random
  const { searchParams } = new URL(req.url);
  let requestedType = searchParams.get('type');

  // Fetch profile to validate sponsor-related types
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_type, sponsored_by_id')
    .eq('id', user.id)
    .single();

  const isSingleWithoutSponsor = profile?.user_type === 'SINGLE' && !profile?.sponsored_by_id;
  let type = requestedType || (Math.random() > 0.5 ? 'system_reassurance' : 'matchmakr_chat');

  // Centralized check: don't create sponsor-related notifications for Singles without a sponsor
  if (SPONSOR_NOTIF_TYPES.has(type) && isSingleWithoutSponsor) {
    console.warn('[debug/notifications/seed] Seed requested sponsor-related type but profile has no sponsor; falling back to system_reassurance');
    type = 'system_reassurance';
  }

  let data: Record<string, unknown>;
  if (type === 'system_reassurance') {
    data = { message: 'No updates yet — but you are still in active consideration.' };
  } else if (type === 'sponsor_updated_profile') {
    data = { reason: 'sponsor_edit', created_by: 'system' };
  } else {
    // matchmakr_chat
    data = { message: 'Your sponsor is talking to another sponsor about you.' };
  }

  // Insert notification with dismissed_at = null (active notification)
  // Use service role client to bypass RLS (no INSERT policy for regular users)
  const { data: notification, error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: user.id,
      type,
      data,
      read: false,
      dismissed_at: null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error seeding notification:', insertError);
    console.error('Insert error details:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    });
    return NextResponse.json({ 
      error: insertError.message || 'Failed to insert notification',
      details: insertError.details,
      hint: insertError.hint
    }, { status: 500 });
  }

  return NextResponse.json({ success: true, notification });
}

