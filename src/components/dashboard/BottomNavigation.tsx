'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { orbitConfig } from '@/config/orbitConfig';
import { getDashboardHref } from '@/utils/routes';
import NotificationNavItem from './NotificationNavItem';

interface BottomNavigationProps {
    userId: string;
}

interface PondSlotProps {
    enabled?: boolean;
    onClick?: () => void;
    href?: string;
    orbitRole?: string | null;
}

function PondSlot({ enabled = false, onClick, href, orbitRole }: PondSlotProps) {
    if (!enabled) {
        return null;
    }

    // Visually distinct circular badge container
    // Ready for future onClick/href wiring but not clickable yet
    const content = (
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-blue to-primary-teal flex items-center justify-center shadow-lg border-2 border-white">
                {/* Placeholder icon - can be replaced later */}
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-white">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            </div>
            <span className="text-xs text-gray-500 mt-1">Pond</span>
        </div>
    );

    // Not clickable yet - render as div
    // Future: can wrap in button (if onClick provided) or Link (if href provided)
    return <div className="flex flex-col items-center">{content}</div>;
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

function renderNavItem(item: BottomNavItem) {
    if (item.kind === 'link') {
        return (
            <NavItemLink
                key={item.key}
                href={item.href}
                icon={item.icon}
                label={item.label}
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
    const { userType } = useAuth();
    
    // Feature flag: Pond slot is not enabled yet
    const ENABLE_POND_SLOT = false;

    const items: BottomNavItem[] = [
        {
            key: 'date-ideas',
            kind: 'link',
            label: 'Date Ideas',
            href: '/dashboard/date-ideas',
            icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <rect x="2" y="8" width="16" height="8" rx="4" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
            ),
        },
        {
            key: 'dashboard',
            kind: 'link',
            label: 'Dashboard',
            href: getDashboardHref(userType),
            icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
            ),
        },
        {
            key: 'settings',
            kind: 'link',
            label: 'Settings',
            href: '/dashboard/settings',
            icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
        {
            key: 'green-room',
            kind: 'link',
            label: 'Green Room',
            href: '/forum',
            icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            show: orbitConfig.enableForum,
        },
    ];

    const visibleItems = items.filter(item => item.show !== false);

    // Split items: before notifications (first 2) and after notifications (rest)
    const itemsBeforeNotifications = visibleItems.slice(0, 2);
    const itemsAfterNotifications = visibleItems.slice(2);

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white/60 backdrop-blur-md shadow-card z-50 border-t border-white/30">
            <div className="flex justify-around items-center py-3">
                {itemsBeforeNotifications.map(renderNavItem)}
                {/* Notifications - special render */}
                <NotificationNavItem key="notifications" userId={userId} />
                {/* Pond Slot - reserved space for future feature */}
                <PondSlot 
                    key="pond-slot"
                    enabled={ENABLE_POND_SLOT}
                    orbitRole={userType || null}
                />
                {itemsAfterNotifications.map(renderNavItem)}
            </div>
        </nav>
    );
}
