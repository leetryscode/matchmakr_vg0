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
      {children}
      {/* Show bottom navigation only for authenticated users and when showBottomNav is true */}
      {user && showBottomNav && <BottomNavigation userId={user.id} />}
    </div>
  );
} 