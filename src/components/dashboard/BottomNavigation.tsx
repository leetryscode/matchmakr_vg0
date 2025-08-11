'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface BottomNavigationProps {
    userId: string;
}

export default function BottomNavigation({ userId }: BottomNavigationProps) {
    const router = useRouter();
    const supabaseRef = useRef(createClient());
    const { user, userType } = useAuth();

    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // User type is now cached in AuthContext, no need to fetch it here

    // Fetch notifications for the current user
    useEffect(() => {
        if (!showDropdown) return;
        setLoading(true);
        supabaseRef.current
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
                setNotifications(data || []);
                setLoading(false);
            });
    }, [showDropdown, userId]);

    // Fetch unread count (for badge)
    useEffect(() => {
        supabaseRef.current
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false)
            .then(({ count }) => setUnreadCount(count || 0));
    }, [userId, showDropdown]);

    // Mark notifications as read when dropdown opens
    useEffect(() => {
        if (!showDropdown || unreadCount === 0) return;
        // Mark all unread notifications as read
        supabaseRef.current
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false)
            .then(() => {
                setUnreadCount(0);
                // Optionally update notifications state to reflect read status
                setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
            });
    }, [showDropdown, unreadCount, userId]);

    // Close dropdown on outside click or Escape
    useEffect(() => {
        if (!showDropdown) return;
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setShowDropdown(false);
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showDropdown]);

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

    const handleLogout = async () => {
        console.log('Logout button clicked');
        try {
            // Call server-side logout route
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                console.log('Server logout successful');
                // Clear client-side storage
                localStorage.clear();
                sessionStorage.clear();
                // Clear all cookies
                document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                // Redirect to login
                window.location.href = '/login';
            } else {
                console.error('Server logout failed');
                window.location.href = '/login';
            }
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/login';
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white/60 backdrop-blur-md shadow-card z-50 border-t border-white/30">
            <div className="flex justify-around items-center py-3">

                {/* Date Ideas Button (Placeholder) */}
                <button className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none">
                    {/* Coffee Cup SVG */}
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                        <rect x="2" y="8" width="16" height="8" rx="4" />
                        <line x1="6" y1="1" x2="6" y2="4" />
                        <line x1="10" y1="1" x2="10" y2="4" />
                        <line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                    <span>Date Ideas</span>
                </button>

                {/* Dashboard Button */}
                <button
                    onClick={handleDashboardClick} 
                    className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none"
                >
                    {/* Home/Dashboard SVG */}
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                    <span>Dashboard</span>
                </button>

                {/* Green Room Button */}
                <Link
                    href="/forum"
                    className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none"
                >
                    {/* Chat/Forum SVG */}
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Green Room</span>
                </Link>

                {/* Bell Notification Icon (functional, with unread count) */}
                <div className="relative flex flex-col items-center">
                    <button
                        className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none"
                        aria-label="Notifications"
                        onClick={() => setShowDropdown(v => !v)}
                    >
                        {/* Bell SVG */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span>Alerts</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-lg border-2 border-white animate-pulse" style={{transform: 'translate(50%,-50%)'}}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {/* Notification Dropdown */}
                    {showDropdown && (
                        <div ref={dropdownRef} className="absolute bottom-12 right-0 w-80 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in">
                            <div className="p-4 border-b font-bold text-lg text-primary-blue">Notifications</div>
                            {loading ? (
                                <div className="p-4 text-center text-gray-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No notifications</div>
                            ) : (
                                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                    {notifications.map((n) => (
                                        <li key={n.id} className={`p-4 ${!n.read ? 'bg-blue-50' : ''}`}>
                                            <div className="font-medium text-sm mb-1">
                                                {n.type === 'matchmakr_chat' ? 'Your sponsor messaged another sponsor about you!' : n.type}
                                            </div>
                                            <div className="text-xs text-gray-500 mb-1">{new Date(n.created_at).toLocaleString()}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
} 