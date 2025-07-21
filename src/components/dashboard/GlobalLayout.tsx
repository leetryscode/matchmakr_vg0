'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';

interface GlobalLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export default function GlobalLayout({ children, showBottomNav = true }: GlobalLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Main content with bottom padding to account for fixed navigation */}
      <div className={`${user && showBottomNav ? 'pb-20' : ''}`}>
        {children}
      </div>
      {/* Show bottom navigation only for authenticated users and when showBottomNav is true */}
      {user && showBottomNav && <BottomNavigation userId={user.id} />}
    </div>
  );
} 