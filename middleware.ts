import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and the current path is not /login, redirect to /login
  if (!user && req.nextUrl.pathname !== '/login') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and the current path is /login, redirect to appropriate dashboard
  if (user && req.nextUrl.pathname === '/login') {
    // Get the user's profile to determine their user type
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    let redirectUrl = '/dashboard/matchmakr' // default
    if (profile?.user_type) {
      redirectUrl = `/dashboard/${profile.user_type.toLowerCase()}`
    }

    const redirectUrlObj = req.nextUrl.clone()
    redirectUrlObj.pathname = redirectUrl
    return NextResponse.redirect(redirectUrlObj)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 