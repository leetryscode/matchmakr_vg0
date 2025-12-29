'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { orbitConfig } from '@/config/orbitConfig';
import { getDashboardHref } from '@/utils/routes';
import { BOTTOM_NAV_HEIGHT_PX } from '@/constants/layout';
import NotificationNavItem from './NotificationNavItem';

interface BottomNavigationProps {
    userId: string;
}

// Floating Pond bubble - separate navigation bubble beside nav pill
// Uses Orbit brand mark (circular "O") - represents a place, not a tool
// Container matches nav pill height for visual consistency
function PondBubble({ href }: { href: string }) {
    return (
        <Link href={href} className="flex items-center justify-center" aria-label="Pond">
            <div 
                className="rounded-full flex items-center justify-center border"
                style={{ 
                    width: `${BOTTOM_NAV_HEIGHT_PX}px`,
                    height: `${BOTTOM_NAV_HEIGHT_PX}px`,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)'
                }}
            >
                {/* Orbit brand mark: stylized "O" - larger to fill space */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/75">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
            </div>
        </Link>
    );
}

type BottomNavItem =
    | { key: string; kind: 'link'; label: string; href: string; icon: React.ReactNode; show?: boolean }
    | { key: string; kind: 'action'; label: string; onClick: () => void; icon: React.ReactNode; show?: boolean };

interface NavItemButtonProps {
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
}

function NavItemButton({ onClick, icon, label }: NavItemButtonProps) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center justify-center focus:outline-none min-w-[44px]"
            aria-label={label}
            title={label}
        >
            <div className="flex items-center justify-center text-white/75 hover:text-white transition-colors" style={{ width: '22px', height: '22px' }}>
                {icon}
            </div>
            <span className="type-meta mt-1 truncate max-w-full">{label}</span>
        </button>
    );
}

interface NavItemLinkProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
}

function NavItemLink({ href, icon, label, isActive = false }: NavItemLinkProps) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center focus:outline-none min-w-[44px]"
            aria-label={label}
            title={label}
        >
            <div className={`flex items-center justify-center transition-colors ${isActive ? 'text-white' : 'text-white/75 hover:text-white'}`} style={{ width: '22px', height: '22px' }}>
                {icon}
            </div>
            <span className={`type-meta mt-1 truncate max-w-full`}>{label}</span>
        </Link>
    );
}

/**
 * Check if pathname matches exactly or is a child of the base path
 */
function isExactOrChild(pathname: string, base: string): boolean {
    if (pathname === base) return true;
    if (pathname.startsWith(base + '/')) return true;
    return false;
}

/**
 * Check if Dashboard route is active (only /dashboard/single or /dashboard/matchmakr, not other /dashboard/* routes)
 */
function isDashboardActive(pathname: string): boolean {
    return isExactOrChild(pathname, '/dashboard/single') || isExactOrChild(pathname, '/dashboard/matchmakr');
}

function renderNavItem(item: BottomNavItem, pathname: string) {
    if (item.kind === 'link') {
        let isActive = false;
        
        if (item.key === 'ideas') {
            // Ideas is active only for /dashboard/date-ideas (exact or children)
            isActive = isExactOrChild(pathname, '/dashboard/date-ideas');
        } else if (item.key === 'settings') {
            // Settings is active only for /dashboard/settings (exact or children)
            isActive = isExactOrChild(pathname, '/dashboard/settings');
        } else if (item.key === 'dashboard') {
            // Dashboard is active only for role-specific dashboard routes (/dashboard/single or /dashboard/matchmakr)
            isActive = isDashboardActive(pathname);
        } else {
            // For other items, use exact match
            isActive = pathname === item.href;
        }
        
        return (
            <NavItemLink
                key={item.key}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive}
            />
        );
    } else {
        return (
            <NavItemButton
                key={item.key}
                onClick={item.onClick}
                icon={item.icon}
                label={item.label}
            />
        );
    }
}

export default function BottomNavigation({ userId }: BottomNavigationProps) {
    const { userType, orbitRole } = useAuth();
    const pathname = usePathname();
    
    // Enable Pond slot only for MATCHMAKR (sponsor) users
    const isPondSlotEnabled = orbitRole === 'MATCHMAKR';

    // Locked navigation order: Ideas → Settings → Dashboard → Notifications → Pond (far right)
    // Each item declares: key, label, icon, href, show condition
    const items: BottomNavItem[] = [
        {
            key: 'ideas',
            kind: 'link',
            label: 'Ideas', // Locked label
            href: '/dashboard/date-ideas',
            icon: (
                // Lightbulb icon (concept: inspiration / exploration)
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 21h6" />
                    <path d="M12 3a6 6 0 0 0-6 6c0 1.5.5 3 1.5 4L9 18h6l1.5-5c1-1 1.5-2.5 1.5-4a6 6 0 0 0-6-6z" />
                    <path d="M12 8v4" />
                    <path d="M12 15h.01" />
                </svg>
            ),
        },
        {
            key: 'settings',
            kind: 'link',
            label: 'Settings', // Locked label
            href: '/dashboard/settings',
            icon: (
                // Gear icon
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
        {
            key: 'dashboard',
            kind: 'link',
            label: 'Dashboard', // Locked label
            href: getDashboardHref(userType),
            icon: (
                // Home icon (dashboard concept)
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
            ),
        },
    ];

    const visibleItems = items.filter(item => item.show !== false);

    return (
        <div 
            className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-3"
            style={{ 
                bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`,
                width: '91%',
                maxWidth: '400px'
            }}
        >
            {/* Floating bottom navigation pill - with labels */}
            <nav 
                className="flex-1 rounded-pill px-4 py-3 overflow-hidden border"
                style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    height: `${BOTTOM_NAV_HEIGHT_PX}px`,
                    minWidth: 0,
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)'
                }}
            >
                {/* Inner container with full height - labels below icons */}
                {/* Order: Ideas → Settings → Dashboard → Notifications */}
                <div className="flex items-center justify-around gap-4 h-full min-w-0">
                    {visibleItems.map(item => renderNavItem(item, pathname))}
                    {/* Notifications - special render (bell icon with label) */}
                    <NotificationNavItem key="notifications" userId={userId} pathname={pathname} />
                </div>
            </nav>
            
            {/* Floating Pond bubble - separate navigation bubble beside nav pill, same height as nav pill */}
            {isPondSlotEnabled && (
                <div style={{ flexShrink: 0 }}>
                    <PondBubble href="/pond" />
                </div>
            )}
        </div>
    );
}
