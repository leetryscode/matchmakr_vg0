import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST /api/forum/replies
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await req.json();
    const { post_id, content } = body;

    if (!post_id || !content || content.length > 280) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert reply
    const { data: reply, error } = await supabase
      .from('forum_replies')
      .insert({
        post_id,
        author_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    // Fetch author info
    const { data: author } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, photos')
      .eq('id', user.id)
      .single();

    const replyWithAuthor = {
      ...reply,
      author: author ? {
        id: author.id,
        full_name: author.full_name,
        user_type: author.user_type,
        profile_image: Array.isArray(author.photos) && author.photos.length > 0 ? author.photos[0] : null,
      } : null,
    };

    return NextResponse.json({ reply: replyWithAuthor });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 