'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { orbitConfig } from '@/config/orbitConfig';
import { getDashboardHref } from '@/utils/routes';
import { BOTTOM_NAV_HEIGHT_PX } from '@/constants/layout';

interface BottomNavigationProps {
    userId: string;
}

// Detects the user's prefers-reduced-motion setting, updating live if it changes.
function usePrefersReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return prefersReduced;
}

// Animated gold Orbit logo — two interlocking rings — Pond navigation button.
// No container circle; the rings ARE the tappable element.
// Shimmer: a gold gradient travels left-to-right across both rings as one surface (4s, linear).
// Glow: a soft radial gold halo pulses behind the rings (4s, ease-in-out).
// Both animations are disabled when prefers-reduced-motion is set.
function PondBubble({ href }: { href: string }) {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center focus:outline-none rounded-card-lg orbit-surface-strong shadow-card overflow-hidden text-orbit-gold"
            aria-label="Discover"
            title="Discover"
            style={{ height: `${BOTTOM_NAV_HEIGHT_PX}px`, width: '74px', gap: '4px' }}
        >
            {/*
             * SVG geometry: two circles, r=14, centers 18px apart (cx=16, cx=34).
             * Left edge: 16-14=2, Right edge: 34+14=48 → ~46px total visual width.
             * Overlap: (14+14)-18 = 10px ≈ 36% of diameter, matching the Orbit brand mark.
             * overflow="visible" lets the glow halo bleed slightly outside the viewBox.
             */}
            <svg
                width="50"
                height="42"
                viewBox="0 0 50 42"
                fill="none"
                aria-hidden="true"
                overflow="visible"
            >
                <defs>
                    {/*
                     * Shimmer gradient in SVG userSpaceOnUse coordinates.
                     * Initial state: x1=-100, x2=50 → bright band at x=-25 (off-screen left).
                     * All SVG viewport pixels (0–50) map to gradient 67–100%, which is solid gold.
                     * Animation: x1 -100→50, x2 50→200 (shifts gradient +150px over 4s).
                     * Bright band sweeps into SVG around t=0.7s, exits around t=2s.
                     * Both rings share this gradient; userSpaceOnUse means they're lit as one surface.
                     */}
                    <linearGradient
                        id="pond-shimmer-grad"
                        gradientUnits="userSpaceOnUse"
                        x1="-100"
                        y1="0"
                        x2="50"
                        y2="0"
                    >
                        {/*
                         * SVG gradient stops cannot read CSS custom properties directly.
                         * currentColor inherits text-orbit-gold from the parent Link element,
                         * giving us theme-aware base gold. The bright flash (#FFFDE8) is
                         * theme-neutral by design.
                         */}
                        <stop offset="0%"   stopColor="currentColor" />
                        <stop offset="40%"  stopColor="currentColor" />
                        <stop offset="50%"  stopColor="#FFFDE8" />
                        <stop offset="60%"  stopColor="currentColor" />
                        <stop offset="100%" stopColor="currentColor" />
                        {!prefersReducedMotion && (
                            <>
                                <animate
                                    attributeName="x1"
                                    values="-100;50"
                                    dur="4s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                                <animate
                                    attributeName="x2"
                                    values="50;200"
                                    dur="4s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            </>
                        )}
                    </linearGradient>

                    {/* Radial gradient for the soft gold glow halo — currentColor inherits text-orbit-gold */}
                    <radialGradient id="pond-glow-grad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="currentColor" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0"   />
                    </radialGradient>

                    {/* Glow pulse CSS animation — @media guard handles prefers-reduced-motion */}
                    <style>{`
                        @media (prefers-reduced-motion: no-preference) {
                            .pond-glow-ellipse {
                                animation: pond-glow-pulse 4s ease-in-out infinite;
                            }
                        }
                        @keyframes pond-glow-pulse {
                            0%, 100% { opacity: 0.15; }
                            50%       { opacity: 0.35; }
                        }
                    `}</style>
                </defs>

                {/* Soft pulsing gold glow — behind the rings in z-order */}
                <ellipse
                    cx="25" cy="21"
                    rx="28" ry="19"
                    fill="url(#pond-glow-grad)"
                    className="pond-glow-ellipse"
                    opacity="0.25"
                />


                {/*
                 * Two interlocking rings — the Orbit brand mark.
                 * Both stroked with the shared shimmer gradient so the light feels continuous.
                 */}
                <circle
                    cx="16" cy="21" r="14"
                    stroke="url(#pond-shimmer-grad)"
                    strokeWidth="2.5"
                    fill="none"
                />
                <circle
                    cx="34" cy="21" r="14"
                    stroke="url(#pond-shimmer-grad)"
                    strokeWidth="2.5"
                    fill="none"
                />
            </svg>

            {/* Gold "Discover" label — uses theme gold variable */}
            <span className="type-meta text-orbit-gold" style={{ lineHeight: '1' }}>
                Discover
            </span>
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
            <div className="flex items-center justify-center text-orbit-text2 hover:text-orbit-text transition-colors" style={{ width: '22px', height: '22px' }}>
                {icon}
            </div>
            <span className="type-meta mt-1 truncate max-w-full text-orbit-text2">{label}</span>
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
            <div className={`flex items-center justify-center transition-colors duration-150 ${isActive ? 'text-orbit-gold' : 'text-orbit-muted hover:text-orbit-text2'}`} style={{ width: '22px', height: '22px' }}>
                {icon}
            </div>
            <span className={`type-meta mt-1 truncate max-w-full transition-colors duration-150 ${isActive ? 'text-orbit-gold' : 'text-orbit-muted'}`}>{label}</span>
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
        
        if (item.key === 'dashboard') {
            isActive = isDashboardActive(pathname);
        } else if (item.key === 'ideas') {
            isActive = isExactOrChild(pathname, '/dashboard/date-ideas');
        } else if (item.key === 'community') {
            isActive = isExactOrChild(pathname, '/communities');
        } else if (item.key === 'settings') {
            isActive = isExactOrChild(pathname, '/dashboard/settings');
        } else {
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

export default function BottomNavigation({ userId: _userId }: BottomNavigationProps) {
    const { userType, orbitRole } = useAuth();
    const pathname = usePathname();
    
    // Enable Pond slot only for MATCHMAKR (sponsor) users
    const isPondSlotEnabled = orbitRole === 'MATCHMAKR';

    // Navigation order: Dashboard → Ideas → Community → Settings → Pond (far right, sponsors only)
    // Each item declares: key, label, icon, href, show condition
    const items: BottomNavItem[] = [
        {
            key: 'dashboard',
            kind: 'link',
            label: 'Dashboard',
            href: getDashboardHref(userType),
            icon: (
                // Home icon (dashboard concept)
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
            ),
        },
        {
            key: 'ideas',
            kind: 'link',
            label: 'Ideas',
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
            key: 'community',
            kind: 'link',
            label: 'Community',
            href: '/communities',
            icon: (
                // People group icon (two person silhouettes side by side)
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    <circle cx="17" cy="7" r="3" />
                    <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
            ),
        },
        {
            key: 'settings',
            kind: 'link',
            label: 'Settings',
            href: '/dashboard/settings',
            icon: (
                // Gear icon
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
            {/* Floating bottom navigation pill — orbit-surface-strong for hierarchy */}
            <nav 
                className="flex-1 rounded-card-lg px-4 py-3 overflow-hidden orbit-surface-strong shadow-card"
                style={{ 
                    height: `${BOTTOM_NAV_HEIGHT_PX}px`,
                    minWidth: 0,
                }}
            >
                {/* Inner container with full height - labels below icons */}
                {/* Order: Dashboard → Ideas → Community → Settings */}
                <div className="flex items-center justify-around gap-4 h-full min-w-0">
                    {visibleItems.map(item => renderNavItem(item, pathname))}
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
