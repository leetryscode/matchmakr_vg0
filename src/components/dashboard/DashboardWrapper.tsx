'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardWrapperProps {
  children: React.ReactNode;
  expectedUserType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardWrapper({ children, expectedUserType }: DashboardWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [userTypeVerified, setUserTypeVerified] = useState(false);
  const [userTypeLoading, setUserTypeLoading] = useState(false);

  useEffect(() => {
    console.log('DashboardWrapper effect:', { 
      loading, 
      user: !!user, 
      expectedUserType, 
      userTypeVerified, 
      userTypeLoading 
    });

    if (loading) {
      console.log('Auth still loading...');
      return;
    }

    if (!user) {
      console.log('No user found, redirecting to login');
      router.push('/login');
      return;
    }

    // If we have an expected user type, verify the user's profile matches
    if (expectedUserType && !userTypeVerified && !userTypeLoading) {
      const verifyUserType = async () => {
        console.log('Starting user type verification for:', expectedUserType);
        setUserTypeLoading(true);
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

          console.log('Profile verification result:', { profile, error });

          if (error) {
            console.error('Error fetching profile:', error);
            setUserTypeLoading(false);
            return;
          }

          if (!profile || profile.user_type !== expectedUserType) {
            console.log(`User type mismatch. Expected: ${expectedUserType}, Got: ${profile?.user_type}`);
            // Redirect to appropriate dashboard based on user type
            if (profile?.user_type) {
              router.push(`/dashboard/${profile.user_type.toLowerCase()}`);
            } else {
              router.push('/');
            }
            return;
          }

          console.log('User type verified successfully');
          setUserTypeVerified(true);
        } catch (error) {
          console.error('Error verifying user type:', error);
        } finally {
          setUserTypeLoading(false);
        }
      };

      verifyUserType();
    } else if (expectedUserType && userTypeVerified) {
      console.log('User type already verified');
    }
  }, [user, loading, expectedUserType, router, supabase, userTypeVerified, userTypeLoading]);

  // Reset verification state when user changes
  useEffect(() => {
    if (user) {
      setUserTypeVerified(false);
      setUserTypeLoading(false);
    }
  }, [user?.id]);

  if (loading || (expectedUserType && !userTypeVerified)) {
    console.log('Showing loading state:', { loading, expectedUserType, userTypeVerified });
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