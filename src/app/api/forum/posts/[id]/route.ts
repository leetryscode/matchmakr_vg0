import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/forum/posts/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== GET ROUTE CALLED for ID:', params.id);
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

// DELETE /api/forum/posts/[id]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log('=== DELETE ROUTE CALLED ===');
  console.log('DELETE API ROUTE CALLED for ID:', params.id);
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

    console.log('DELETE request for post ID:', postId);

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

    console.log('Post author check:', { 
      postAuthorId: post.author_id, 
      currentUserId: user.id, 
      isMatch: post.author_id === user.id,
      postAuthorType: typeof post.author_id,
      currentUserType: typeof user.id
    });

    if (post.author_id !== user.id) {
      console.log('Authorization failed:', { postAuthor: post.author_id, currentUser: user.id });
      return NextResponse.json({ error: 'You can only delete your own posts', status: 403 });
    }

    // Test: Try to read the post again to make sure we can access it
    const { data: testRead, error: testError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();
    
    console.log('Test read before delete:', { testRead, testError });

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

    // Verify the post was actually deleted
    const { data: verifyPost, error: verifyError } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', postId)
      .single();

    console.log('Verification after delete:', { verifyPost, verifyError });

    if (verifyPost) {
      console.error('Post still exists after delete operation');
      return NextResponse.json({ error: 'Post was not deleted', status: 500 });
    }

    console.log('Post deleted successfully');
    return NextResponse.json({ 
      message: 'Post deleted successfully',
      timestamp: new Date().toISOString(),
      route: 'posts-id-route',
      postId: postId
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', status: 500 });
  }
} 