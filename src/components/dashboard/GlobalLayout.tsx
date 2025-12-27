'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import { BOTTOM_NAV_HEIGHT_PX } from '@/constants/layout';

interface GlobalLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export default function GlobalLayout({ children, showBottomNav = true }: GlobalLayoutProps) {
  const { user } = useAuth();
  const shouldShowBottomNav = user && showBottomNav;

  return (
    <div 
      className="min-h-screen"
      style={shouldShowBottomNav ? ({ '--bottom-nav-h': `${BOTTOM_NAV_HEIGHT_PX}px` } as React.CSSProperties) : undefined}
    >
      {/* Main content with bottom padding to account for fixed navigation */}
      <div className={shouldShowBottomNav ? 'pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))]' : ''}>
        {children}
      </div>
      {/* Show bottom navigation only for authenticated users and when showBottomNav is true */}
      {shouldShowBottomNav && <BottomNavigation userId={user.id} />}
    </div>
  );
} 