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

  // Create service role client for INSERT (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Get notification type from query params, otherwise random
  const { searchParams } = new URL(req.url);
  const notificationType = searchParams.get('type');

  // Randomly choose between two types unless specified via query param
  const type = notificationType || (Math.random() > 0.5 ? 'system_reassurance' : 'matchmakr_chat');

  let data;
  if (type === 'system_reassurance') {
    data = { message: 'No updates yet — but you are still in active consideration.' };
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
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, notification });
}

