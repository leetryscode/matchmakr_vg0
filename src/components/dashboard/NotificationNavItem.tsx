'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardHref } from '@/utils/routes';

interface NotificationNavItemProps {
    userId: string;
    pathname: string;
}

export default function NotificationNavItem({ userId, pathname }: NotificationNavItemProps) {
    const router = useRouter();
    const { userType } = useAuth();
    // Notifications come from context (NotificationsProvider) - userId parameter is ignored
    const { activeCount } = useNotifications();
    const [hideBadge, setHideBadge] = useState(false);
    const prevActiveCountRef = React.useRef<number>(0);
    
    // Reset badge visibility when new notifications arrive
    useEffect(() => {
        const hadNotifications = prevActiveCountRef.current > 0;
        const hasNewNotifications = activeCount > prevActiveCountRef.current;
        
        if (hasNewNotifications && hadNotifications) {
            // New notification arrived - show badge again
            setHideBadge(false);
        }
        
        prevActiveCountRef.current = activeCount;
    }, [activeCount]);
    
    const handleClick = () => {
        // Hide badge when bell is clicked
        if (activeCount > 0) {
            setHideBadge(true);
        }
        
        // Get the appropriate dashboard route based on user type
        const dashboardRoute = getDashboardHref(userType);
        
        // Navigate to dashboard
        router.push(dashboardRoute);
        
        // Scroll to top of page (same view as when dashboard opens)
        // Use multiple attempts to ensure scroll works even if DOM isn't ready
        const attemptScroll = (attempts = 0) => {
            if (attempts < 10) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // If we're already at the top, we're done; otherwise retry after a delay
                if (window.scrollY > 0) {
                    setTimeout(() => attemptScroll(attempts + 1), 50 * (attempts + 1));
                }
            }
        };
        setTimeout(() => attemptScroll(), 100);
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-w-[44px]">
            <button
                className="flex flex-col items-center justify-center focus:outline-none relative"
                aria-label="Notifications"
                title="Notifications"
                onClick={handleClick}
            >
                {/* Bell SVG */}
                <div className={`flex items-center justify-center transition-colors ${activeCount > 0 ? 'text-white' : 'text-white/70 hover:text-white'}`} style={{ width: '22px', height: '22px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </div>
                <span className={`type-meta mt-1 truncate max-w-full ${activeCount > 0 ? 'text-white' : 'text-white/70'}`}>Notifications</span>
                {activeCount > 0 && !hideBadge && (
                    <span className="absolute top-0 right-0 bg-action-primary text-primary-blue text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-cta-entry border-0" style={{transform: 'translate(50%,-50%)'}}>
                        {activeCount}
                    </span>
                )}
            </button>
        </div>
    );
}
