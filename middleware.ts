import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { orbitConfig } from '@/config/orbitConfig'
import { normalizeToOrbitRole } from '@/types/orbit'

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

    // If user is not signed in and trying to access protected routes, redirect to welcome page
    if (!user) {
      // Allow access to public routes (welcome page, login, API endpoints)
      if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/api/')) {
        return res;
      }
      
      // Redirect to welcome page for all protected routes
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      return NextResponse.redirect(redirectUrl)
    }

    // Helper function to redirect authenticated user to role-specific dashboard
    const redirectToRoleDashboard = async (pathname: string) => {
      // Get the user's profile to determine their user type
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        // If profile fetch fails, don't redirect to default dashboard - let client handle it
        if (profileError || !profile) {
          console.log('[Middleware] Profile fetch failed for user', user.id, 'on path', pathname, 'error:', profileError?.message || 'No profile found');
          return res; // Let the client handle the error
        }

        let redirectUrl = '/dashboard/matchmakr' // default
        if (profile?.user_type) {
          // Normalize to Orbit role (vendor becomes matchmakr)
          const orbitRole = normalizeToOrbitRole(profile.user_type)
          if (orbitRole) {
            redirectUrl = `/dashboard/${orbitRole.toLowerCase()}`
          }
          // If normalization fails, use default
        }

        const redirectUrlObj = req.nextUrl.clone()
        redirectUrlObj.pathname = redirectUrl
        return NextResponse.redirect(redirectUrlObj)
      } catch (error) {
        console.log('[Middleware] Profile fetch exception for user', user.id, 'on path', pathname, 'error:', error instanceof Error ? error.message : 'Unknown error');
        // If we can't fetch the profile, return res to let client handle it (preferred over redirecting)
        return res;
      }
    }

    // If user is signed in and the current path is /login or /dashboard, redirect to appropriate dashboard
    if (user && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/dashboard')) {
      return redirectToRoleDashboard(req.nextUrl.pathname)
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