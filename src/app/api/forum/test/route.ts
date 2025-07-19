import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Test database connection
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('*')
      .limit(1);
    
    if (categoriesError) {
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: categoriesError.message 
      }, { status: 500 });
    }
    
    // Test posts table
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .limit(1);
    
    if (postsError) {
      return NextResponse.json({ 
        error: 'Posts table access failed', 
        details: postsError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      categoriesCount: categories?.length || 0,
      postsCount: posts?.length || 0,
      message: 'Database connection and tables are working'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 