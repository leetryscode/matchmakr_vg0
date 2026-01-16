'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatModalProvider, useChatModal } from '@/contexts/ChatModalContext';
import BottomNavigation from './BottomNavigation';
import { BOTTOM_NAV_HEIGHT_PX } from '@/constants/layout';
import InstallNudge from '../pwa/InstallNudge';

interface GlobalLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

/**
 * Determines if bottom navigation should be shown for a given pathname.
 * Only shows nav on authenticated app routes, not on auth/onboarding pages.
 */
function shouldShowBottomNavForPath(pathname: string): boolean {
  // Disallowed routes (hide nav)
  if (pathname === '/') return false;
  if (pathname === '/login') return false;
  if (pathname.startsWith('/onboarding')) return false;
  if (pathname.startsWith('/auth/')) return false;
  // Hide nav on all chat routes (single-single, sponsor-sponsor, sponsor-single)
  // Match exactly '/dashboard/chat' or '/dashboard/chat/*'
  if (pathname === '/dashboard/chat' || pathname.startsWith('/dashboard/chat/')) return false;
  
  // Allowed routes (show nav)
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/pond')) return true;
  if (pathname.startsWith('/profile/')) return true;
  
  // Default to false for unknown routes
  return false;
}

function GlobalLayoutContent({ children, showBottomNav = true }: GlobalLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { isAnyChatModalOpen } = useChatModal();
  // Hide bottom nav if any chat modal is open or if on a chat page route
  const shouldShowBottomNav = user && showBottomNav && shouldShowBottomNavForPath(pathname) && !isAnyChatModalOpen;

  // Always set CSS variable to prevent layout jumps - set to 0 when hidden
  useEffect(() => {
    const root = document.documentElement;
    if (shouldShowBottomNav) {
      root.style.setProperty('--bottom-nav-h', `${BOTTOM_NAV_HEIGHT_PX}px`);
    } else {
      root.style.setProperty('--bottom-nav-h', '0px');
    }
    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--bottom-nav-h');
    };
  }, [shouldShowBottomNav]);

  return (
    <div className="min-h-[100dvh] bg-dashboard">
      {/* Main content with bottom padding to account for fixed navigation - always applied to prevent jump */}
      <div className="pb-[calc(var(--bottom-nav-h,0px)+1rem+env(safe-area-inset-bottom))] transition-[padding-bottom] duration-200">
        {/* Install nudge - only shown in browser mode on dashboard routes */}
        <InstallNudge />
        {children}
      </div>
      {/* Show bottom navigation only for authenticated users on allowed routes */}
      {shouldShowBottomNav && <BottomNavigation userId={user.id} />}
    </div>
  );
}

export default function GlobalLayout({ children, showBottomNav = true }: GlobalLayoutProps) {
  return (
    <ChatModalProvider>
      <GlobalLayoutContent showBottomNav={showBottomNav}>
        {children}
      </GlobalLayoutContent>
    </ChatModalProvider>
  );
} 