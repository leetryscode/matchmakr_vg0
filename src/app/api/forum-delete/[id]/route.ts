import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST /api/forum-delete/[id] (for testing)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== FORUM DELETE POST ROUTE CALLED ===');
  console.log('POST API ROUTE CALLED for ID:', params.id);
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const postId = params.id;

    console.log('POST request for post ID:', postId);

    if (!postId) {
      return NextResponse.json({ error: 'Missing post ID', status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user?.id, 'User error:', userError);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Please log in to delete posts', status: 401 });
    }

    // Check if user is the author of the post
    const { data: post, error: fetchError } = await supabase
      .from('forum_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    console.log('Fetched post:', post, 'Fetch error:', fetchError);

    if (fetchError) {
      console.error('Error fetching post:', fetchError);
      return NextResponse.json({ error: 'Post not found', status: 404 });
    }

    if (post.author_id !== user.id) {
      console.log('Authorization failed:', { postAuthor: post.author_id, currentUser: user.id });
      return NextResponse.json({ error: 'You can only delete your own posts', status: 403 });
    }

    // Delete the post (replies will be automatically deleted due to CASCADE)
    console.log('About to delete post with ID:', postId);
    const { error: deleteError } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId);

    console.log('Delete result:', { deleteError });

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post', status: 500 });
    }

    console.log('Post deleted successfully');
    return NextResponse.json({ 
      message: 'Post deleted successfully',
      timestamp: new Date().toISOString(),
      route: 'forum-delete-post-route',
      postId: postId
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', status: 500 });
  }
} 