import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Get the user's profile to determine their user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      let redirectUrl = '/dashboard/matchmakr' // default
      if (profile?.user_type) {
        redirectUrl = `/dashboard/${profile.user_type.toLowerCase()}`
      }

      console.log('Auth callback successful, redirecting to:', redirectUrl);
      return NextResponse.redirect(`${origin}${redirectUrl}`)
    }
     console.error('Auth callback error:', error?.message);
  } else {
    console.log('Auth callback: No code found in params');
  }

  // return the user to an error page with instructions
  console.log('Redirecting to auth error page');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
} 