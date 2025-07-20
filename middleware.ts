import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If there's an auth error, don't redirect immediately - let the client handle it
    if (error) {
      console.log('Middleware auth error:', error);
      return res;
    }

    // If user is not signed in and the current path is not /login, redirect to /login
    if (!user && req.nextUrl.pathname !== '/login' && !req.nextUrl.pathname.startsWith('/api/')) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and the current path is /login, redirect to appropriate dashboard
    if (user && req.nextUrl.pathname === '/login') {
      // Get the user's profile to determine their user type
      try {
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
      } catch (error) {
        console.error('Error fetching profile in middleware:', error);
        // If we can't fetch the profile, just redirect to the default dashboard
        const redirectUrlObj = req.nextUrl.clone()
        redirectUrlObj.pathname = '/dashboard/matchmakr'
        return NextResponse.redirect(redirectUrlObj)
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
  }
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