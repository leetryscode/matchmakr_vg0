import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/forum/posts/[postId]/replies
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    console.log('Fetching replies for post ID:', params.id);

    // First, let's check what's in the forum_posts table directly
    const { data: directReplies, error: directError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('parent_post_id', params.id);

    console.log('Direct query result:', { directReplies, directError });

    // Let's also check what all posts look like to understand the structure
    const { data: allPosts, error: allPostsError } = await supabase
      .from('forum_posts')
      .select('id, content, parent_post_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('All posts sample:', { allPosts, allPostsError });

    // Get replies for the specific post - use direct query like debug route
    const { data: replies, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles!forum_posts_author_id_fkey (
          id,
          name,
          user_type,
          photos
        )
      `)
      .eq('parent_post_id', params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('Direct query result for replies:', { replies, error });

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json({ error: 'Failed to fetch replies', status: 500 });
    }

    return NextResponse.json({ replies: replies || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', status: 500 });
  }
} 