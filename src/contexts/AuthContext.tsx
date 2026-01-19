'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { orbitConfig } from '@/config/orbitConfig';
import { normalizeToOrbitRole, OrbitUserRole } from '@/types/orbit';
import { NotificationsProvider } from './NotificationsContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userType: string | null; // Database user type (can include VENDOR)
  orbitRole: OrbitUserRole | null; // Normalized Orbit role (SINGLE | MATCHMAKR only)
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null); // Database user type
  const [orbitRole, setOrbitRole] = useState<OrbitUserRole | null>(null); // Normalized Orbit role
  const userTypeRef = useRef<string | null>(null);
  const orbitRoleRef = useRef<OrbitUserRole | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Function to fetch and cache user type
  const fetchUserType = async (userId: string) => {
    console.log('AuthContext: Fetching user type for userId:', userId);
    try {
      // First try to get user type from profiles table (SINGLE/SPONSOR users)
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      // If no profile found, check if it's a vendor user
      if (error && error.code === 'PGRST116') {
        console.log('AuthContext: No profile found, checking if vendor...');
        const { data: vendorProfile, error: vendorError } = await supabase
          .from('vendor_profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (vendorProfile && !vendorError) {
          console.log('AuthContext: Vendor profile found, setting user type to VENDOR');
          setUserType('VENDOR');
          userTypeRef.current = 'VENDOR';
          // Normalize vendor to MATCHMAKR for Orbit routing
          const normalized = normalizeToOrbitRole('VENDOR');
          setOrbitRole(normalized);
          orbitRoleRef.current = normalized;
          return;
        }
      }

      console.log('AuthContext: Profile fetch result:', { profile, error });

      if (error) {
        console.error('AuthContext: Error fetching user type:', error);
        return;
      }

      if (profile?.user_type) {
        console.log('AuthContext: Cached user type:', profile.user_type);
        setUserType(profile.user_type);
        userTypeRef.current = profile.user_type;
        // Normalize to Orbit role
        const normalized = normalizeToOrbitRole(profile.user_type);
        setOrbitRole(normalized);
        orbitRoleRef.current = normalized;
        console.log('AuthContext: userType state updated to:', profile.user_type);
        console.log('AuthContext: orbitRole updated to:', normalized);
        console.log('AuthContext: userTypeRef.current is now:', userTypeRef.current);
      } else {
        console.log('AuthContext: No user_type found in profile:', profile);
      }
    } catch (error) {
      console.error('AuthContext: Exception fetching user type:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          // Don't redirect on common session errors - these are normal for unauthenticated users
          const nonRedirectErrors = ['Invalid JWT', 'Auth session missing', 'JWT expired', 'No session'];
          if (!nonRedirectErrors.some(msg => error.message.includes(msg))) {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(';').forEach(function(c) {
              document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
            router.push('/');
          }
          setUser(null);
        } else if (!user) {
          // No user but no error - this is normal for unauthenticated users
          setUser(null);
          setUserType(null);
          setOrbitRole(null);
        } else {
          setUser(user);
          // Fetch user type when user is set
          await fetchUserType(user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
        // Don't redirect on common session errors
        const nonRedirectErrors = ['Invalid JWT', 'Auth session missing', 'JWT expired', 'No session'];
        if (!(err instanceof Error) || !nonRedirectErrors.some(msg => err.message.includes(msg))) {
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(';').forEach(function(c) {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          });
          router.push('/');
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle auth state changes
        if (event === 'SIGNED_OUT') {
          // Clear any cached data and redirect to welcome page
          setUserType(null);
          setOrbitRole(null);
          router.push('/');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Check current path FIRST before doing anything else
          // Use window.location.pathname for accurate current path in async callback
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname || '/';
          
          // Valid pages that should NOT trigger redirects
          const isValidPage = 
            currentPath === '/pond' ||
            currentPath.startsWith('/profile/') ||
            currentPath.match(/^\/dashboard\/(matchmakr|single|vendor|settings|chat)/);
          
          // Only redirect from login/welcome/auth pages, or invalid dashboard routes
          const shouldRedirect = !isValidPage && (
            currentPath === '/' || 
            currentPath === '/login' || 
            currentPath.startsWith('/auth/') ||
            (currentPath.startsWith('/dashboard/') && !currentPath.match(/^\/dashboard\/(matchmakr|single|vendor|settings|chat)/))
          );
          
          // If we're on a valid page, don't redirect at all - just fetch user type in background
          if (!shouldRedirect) {
            console.log('[AuthContext] User already on valid page, skipping redirect and fetching user type in background:', currentPath);
            // Still fetch user type in background for the page to use
            fetchUserType(session.user.id).catch(err => {
              console.error('[AuthContext] Error fetching user type in background:', err);
            });
            return;
          }
          
          // Only fetch and redirect if we're on a page that should redirect
          const fetchPromise = fetchUserType(session.user.id);
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000)); // 5 second timeout
          
          await Promise.race([fetchPromise, timeoutPromise]);
          
          // Use the orbitRoleRef to get the normalized Orbit role for routing
          if (orbitRoleRef.current) {
            const role = orbitRoleRef.current.toLowerCase();
            console.log('[AuthContext] Redirecting to dashboard:', role);
            router.push(`/dashboard/${role}`);
          } else if (userTypeRef.current) {
            // Fallback: normalize and redirect
            const normalized = normalizeToOrbitRole(userTypeRef.current);
            if (normalized) {
              console.log('[AuthContext] Redirecting to dashboard (normalized):', normalized.toLowerCase());
              router.push(`/dashboard/${normalized.toLowerCase()}`);
            } else {
              console.log('[AuthContext] No normalized role, redirecting to default dashboard');
              router.push('/dashboard/matchmakr'); // Default fallback
            }
          } else {
            console.warn('[AuthContext] SIGNED_IN but no user type found after fetch - redirecting to default dashboard');
            router.push('/dashboard/matchmakr');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, userType, orbitRole, signOut }}>
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 