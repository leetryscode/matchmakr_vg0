'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrbitUserRole, normalizeToOrbitRole } from '@/types/orbit';

interface DashboardWrapperProps {
  children: React.ReactNode;
  expectedUserType?: OrbitUserRole; // Only Orbit roles (SINGLE | MATCHMAKR)
}

export default function DashboardWrapper({ children, expectedUserType }: DashboardWrapperProps) {
  const { user, loading, orbitRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('DashboardWrapper effect:', { 
      loading, 
      user: !!user, 
      expectedUserType, 
      orbitRole
    });

    if (loading) {
      console.log('Auth still loading...');
      return;
    }

    if (!user) {
      console.log('No user found, redirecting to welcome page');
      router.push('/');
      return;
    }

    // If we have an expected user type, verify it matches the Orbit role
    if (expectedUserType && orbitRole && orbitRole !== expectedUserType) {
      console.log(`Orbit role mismatch. Expected: ${expectedUserType}, Got: ${orbitRole}`);
      router.push(`/dashboard/${orbitRole.toLowerCase()}`);
      return;
    }
  }, [user, loading, expectedUserType, orbitRole, router]);

  if (loading) {
    console.log('Showing loading state: Auth still loading');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-main">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // If we have an expected user type but no cached Orbit role, allow access anyway
  // This prevents infinite loading when the cache hasn't populated yet
  if (expectedUserType && !orbitRole) {
    console.log('No cached Orbit role, but allowing access to prevent infinite loading');
    // Don't show loading screen, just render the children
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
} 