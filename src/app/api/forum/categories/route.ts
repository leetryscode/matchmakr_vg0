import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get all categories
    const { data: categories, error } = await supabase
      .from('forum_categories')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Transform the data to include post_count (set to 0 for now)
    const categoriesWithCounts = (categories || []).map((category: any) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      post_count: 0, // We'll implement proper counting later if needed
    }));

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 