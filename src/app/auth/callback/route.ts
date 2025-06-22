import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('Auth callback successful, redirecting to: /login');
      return NextResponse.redirect(`${origin}/login`)
    }
     console.error('Auth callback error:', error.message);
  } else {
    console.log('Auth callback: No code found in params');
  }

  // return the user to an error page with instructions
  console.log('Redirecting to auth error page');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
} 