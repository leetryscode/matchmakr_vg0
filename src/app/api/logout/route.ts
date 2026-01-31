import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    // Sign out using server client
    await supabase.auth.signOut();
    
    // Clear any remaining auth cookies
    const response = NextResponse.json({ success: true });
    
    // Clear the auth cookie
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
} 