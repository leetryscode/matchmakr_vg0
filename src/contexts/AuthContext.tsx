'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userType: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Function to fetch and cache user type
  const fetchUserType = async (userId: string) => {
    console.log('AuthContext: Fetching user type for userId:', userId);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      console.log('AuthContext: Profile fetch result:', { profile, error });

      if (error) {
        console.error('AuthContext: Error fetching user type:', error);
        return;
      }

      if (profile?.user_type) {
        console.log('AuthContext: Cached user type:', profile.user_type);
        setUserType(profile.user_type);
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
          // Only clear and redirect if it's a real auth error, not just no session
          if (error.message !== 'Invalid JWT') {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(';').forEach(function(c) {
              document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
            router.push('/login');
          }
          setUser(null);
        } else if (!user) {
          // No user but no error - this is normal for unauthenticated users
          setUser(null);
          setUserType(null);
        } else {
          setUser(user);
          // Fetch user type when user is set
          fetchUserType(user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
        // Only clear and redirect on actual errors, not just no session
        if (err instanceof Error && err.message !== 'Invalid JWT') {
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(';').forEach(function(c) {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          });
          router.push('/login');
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
          // Clear any cached data and redirect to login
          setUserType(null);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Fetch and cache user type, then redirect
          await fetchUserType(session.user.id);
          if (userType) {
            router.push(`/dashboard/${userType.toLowerCase()}`);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, userType, signOut }}>
      {children}
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