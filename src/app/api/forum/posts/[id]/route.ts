import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/forum/posts/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const postId = params.id;

    // Fetch post with author info
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(id, full_name, user_type, photos)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch replies with author info
    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select(`
        *,
        author:profiles(id, full_name, user_type, photos)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    // Map author info for post
    const postWithAuthor = {
      ...post,
      author: post.author
        ? {
            id: post.author.id,
            full_name: post.author.full_name,
            user_type: post.author.user_type,
            profile_image:
              Array.isArray(post.author.photos) && post.author.photos.length > 0
                ? post.author.photos[0]
                : null,
          }
        : null,
    };

    // Map author info for replies
    const repliesWithAuthor = (replies || []).map((reply: any) => ({
      ...reply,
      author: reply.author
        ? {
            id: reply.author.id,
            full_name: reply.author.full_name,
            user_type: reply.author.user_type,
            profile_image:
              Array.isArray(reply.author.photos) && reply.author.photos.length > 0
                ? reply.author.photos[0]
                : null,
          }
        : null,
    }));

    return NextResponse.json({
      post: postWithAuthor,
      replies: repliesWithAuthor,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 