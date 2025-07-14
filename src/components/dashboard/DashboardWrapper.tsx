'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardWrapperProps {
  children: React.ReactNode;
  expectedUserType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardWrapper({ children, expectedUserType }: DashboardWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // If we have an expected user type, verify the user's profile matches
    if (expectedUserType) {
      const verifyUserType = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (!profile || profile.user_type !== expectedUserType) {
          // Redirect to appropriate dashboard based on user type
          if (profile?.user_type) {
            router.push(`/dashboard/${profile.user_type.toLowerCase()}`);
          } else {
            router.push('/');
          }
        }
      };

      verifyUserType();
    }
  }, [user, loading, expectedUserType, router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
} 