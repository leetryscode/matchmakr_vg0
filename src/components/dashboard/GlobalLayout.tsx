'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import { BOTTOM_NAV_HEIGHT_PX } from '@/constants/layout';

interface GlobalLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

/**
 * Determines if bottom navigation should be shown for a given pathname.
 * Only shows nav on authenticated app routes, not on auth/onboarding pages.
 */
function shouldShowBottomNavForPath(pathname: string): boolean {
  // Allowed routes (show nav)
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/pond')) return true;
  if (pathname.startsWith('/profile/')) return true;
  
  // Disallowed routes (hide nav)
  if (pathname === '/') return false;
  if (pathname === '/login') return false;
  if (pathname.startsWith('/onboarding')) return false;
  if (pathname.startsWith('/auth/')) return false;
  
  // Default to false for unknown routes
  return false;
}

export default function GlobalLayout({ children, showBottomNav = true }: GlobalLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const shouldShowBottomNav = user && showBottomNav && shouldShowBottomNavForPath(pathname);

  return (
    <div 
      className="min-h-[100dvh] bg-dashboard"
      style={shouldShowBottomNav ? ({ '--bottom-nav-h': `${BOTTOM_NAV_HEIGHT_PX}px` } as React.CSSProperties) : undefined}
    >
      {/* Main content with bottom padding to account for fixed navigation */}
      <div className={shouldShowBottomNav ? 'pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))]' : ''}>
        {children}
      </div>
      {/* Show bottom navigation only for authenticated users on allowed routes */}
      {shouldShowBottomNav && <BottomNavigation userId={user.id} />}
    </div>
  );
} 