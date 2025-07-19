import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get all posts with their structure
    const { data: allPosts, error: allPostsError } = await supabase
      .from('forum_posts')
      .select('id, content, parent_post_id, created_at, author_id')
      .order('created_at', { ascending: false });

    // Get the view data to see how reply counts are calculated
    const { data: viewData, error: viewError } = await supabase
      .from('forum_posts_with_counts')
      .select('id, content, reply_count, parent_post_id')
      .order('created_at', { ascending: false });

    // Check specific post that should have replies
    const testPostId = 'f3336789-2e67-49f9-bd51-08009f168c42';
    const { data: testPost, error: testPostError } = await supabase
      .from('forum_posts_with_counts')
      .select('*')
      .eq('id', testPostId)
      .single();

    // Check for replies to this specific post
    const { data: testReplies, error: testRepliesError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('parent_post_id', testPostId);

    return NextResponse.json({
      allPosts: allPosts || [],
      viewData: viewData || [],
      testPost: testPost,
      testReplies: testReplies || [],
      errors: {
        allPostsError,
        viewError,
        testPostError,
        testRepliesError
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 