'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { OrbitUserRole } from '@/types/orbit';

interface DashboardWrapperProps {
  children: React.ReactNode;
  expectedUserType?: OrbitUserRole; // Only Orbit roles (SINGLE | MATCHMAKR)
}

export default function DashboardWrapper({ children, expectedUserType }: DashboardWrapperProps) {
  const { user, loading, orbitRole } = useAuth();
  const router = useRouter();
  const [waitingForRole, setWaitingForRole] = useState(false);
  const roleWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (roleWaitTimeoutRef.current) {
      clearTimeout(roleWaitTimeoutRef.current);
      roleWaitTimeoutRef.current = null;
    }

    // Don't do anything while auth is still loading
    if (loading) {
      return;
    }

    // If no user, redirect to welcome page
    if (!user) {
      router.push('/');
      return;
    }

    // If we have an expected user type, wait a bit for orbitRole to load
    if (expectedUserType) {
      if (!orbitRole) {
        // Wait up to 3 seconds for role to load
        setWaitingForRole(true);
        roleWaitTimeoutRef.current = setTimeout(() => {
          setWaitingForRole(false);
          // After timeout, allow access anyway to prevent infinite loading
          // The page itself will handle authorization once role loads
        }, 3000);
        return;
      }

      // Clear waiting state if role is now available
      setWaitingForRole(false);
      if (roleWaitTimeoutRef.current) {
        clearTimeout(roleWaitTimeoutRef.current);
        roleWaitTimeoutRef.current = null;
      }

      // If role doesn't match expected type, redirect
      if (orbitRole !== expectedUserType) {
        router.push(`/dashboard/${orbitRole.toLowerCase()}`);
        return;
      }
    }
  }, [user, loading, expectedUserType, orbitRole, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (roleWaitTimeoutRef.current) {
        clearTimeout(roleWaitTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state while auth is loading or waiting for role
  if (loading || waitingForRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-main">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // If no user after loading, return null (will redirect)
  if (!user) {
    return null;
  }

  return <>{children}</>;
} 