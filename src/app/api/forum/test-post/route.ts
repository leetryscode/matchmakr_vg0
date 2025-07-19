import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the first category
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('id')
      .limit(1);
    
    if (categoriesError || !categories || categories.length === 0) {
      return NextResponse.json({ 
        error: 'No categories found', 
        details: categoriesError?.message 
      }, { status: 500 });
    }
    
    const categoryId = categories[0].id;
    
    // Insert a test post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        content: 'This is a test post to verify the database is working',
        category_id: categoryId,
        author_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      })
      .select()
      .single();
    
    if (postError) {
      return NextResponse.json({ 
        error: 'Failed to create test post', 
        details: postError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      post: post,
      message: 'Test post created successfully'
    });
  } catch (error) {
    console.error('Test post endpoint error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 