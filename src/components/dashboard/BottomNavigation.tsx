'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { orbitConfig } from '@/config/orbitConfig';
import NotificationNavItem from './NotificationNavItem';

interface BottomNavigationProps {
    userId: string;
}

interface NavItemButtonProps {
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
}

function NavItemButton({ onClick, icon, label }: NavItemButtonProps) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

interface NavItemLinkProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

function NavItemLink({ href, icon, label }: NavItemLinkProps) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}

export default function BottomNavigation({ userId }: BottomNavigationProps) {
    const router = useRouter();
    const { userType } = useAuth();

    const handleDashboardClick = () => {
        console.log('=== DASHBOARD CLICK ===');
        console.log('User type:', userType);
        console.log('Router object:', router);
        
        if (!userType) {
            console.log('No user type, trying fallback navigation');
            // Try to navigate to a default dashboard route
            try {
                router.push('/dashboard/matchmakr');
                console.log('Fallback navigation to /dashboard/matchmakr');
            } catch (error) {
                console.error('Error with fallback navigation:', error);
            }
            return;
        }
        
        const dashboardPath = `/dashboard/${userType.toLowerCase()}`;
        console.log('Attempting navigation to:', dashboardPath);
        
        try {
            router.push(dashboardPath);
            console.log('router.push called successfully');
        } catch (error) {
            console.error('Error navigating to dashboard:', error);
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white/60 backdrop-blur-md shadow-card z-50 border-t border-white/30">
            <div className="flex justify-around items-center py-3">
                {/* Date Ideas Button (Placeholder) */}
                <NavItemButton
                    icon={
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                            <rect x="2" y="8" width="16" height="8" rx="4" />
                            <line x1="6" y1="1" x2="6" y2="4" />
                            <line x1="10" y1="1" x2="10" y2="4" />
                            <line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                    }
                    label="Date Ideas"
                />

                {/* Dashboard Button */}
                <NavItemButton
                    onClick={handleDashboardClick}
                    icon={
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                    }
                    label="Dashboard"
                />

                {/* Green Room Button - Hidden when forum is disabled */}
                {orbitConfig.enableForum && (
                    <NavItemLink
                        href="/forum"
                        icon={
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                        label="Green Room"
                    />
                )}

                {/* Bell Notification Icon (functional, with unread count) */}
                <NotificationNavItem userId={userId} />
            </div>
        </nav>
    );
}
