import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DEV-only route to seed example notifications
export async function POST(req: NextRequest) {
  // Production safety: return 404 in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Insert notification
  const { data: notification, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type,
      data,
      read: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error seeding notification:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, notification });
}

