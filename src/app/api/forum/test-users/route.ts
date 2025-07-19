import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, user_type')
      .limit(10);
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch profiles', 
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      profiles: profiles || [],
      count: profiles?.length || 0
    });
  } catch (error) {
    console.error('Test users endpoint error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 