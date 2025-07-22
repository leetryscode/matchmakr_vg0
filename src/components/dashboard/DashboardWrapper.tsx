'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardWrapperProps {
  children: React.ReactNode;
  expectedUserType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardWrapper({ children, expectedUserType }: DashboardWrapperProps) {
  const { user, loading, userType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('DashboardWrapper effect:', { 
      loading, 
      user: !!user, 
      expectedUserType, 
      userType
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

    // If we have an expected user type, verify it matches the cached user type
    if (expectedUserType && userType && userType !== expectedUserType) {
      console.log(`User type mismatch. Expected: ${expectedUserType}, Got: ${userType}`);
      router.push(`/dashboard/${userType.toLowerCase()}`);
      return;
    }
  }, [user, loading, expectedUserType, userType, router]);

  if (loading) {
    console.log('Showing loading state: Auth still loading');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-main">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // If we have an expected user type but no cached user type, allow access anyway
  // This prevents infinite loading when the cache hasn't populated yet
  if (expectedUserType && !userType) {
    console.log('No cached user type, but allowing access to prevent infinite loading');
    // Don't show loading screen, just render the children
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
} 