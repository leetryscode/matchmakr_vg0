'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName: string | null;
    userId: string;
    userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardLayout({ children, firstName, userId, userType }: DashboardLayoutProps) {
    const router = useRouter();
    const supabase = createClient();
    const { signOut } = useAuth();

    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications for the current user
    useEffect(() => {
        if (!showDropdown) return;
        setLoading(true);
        supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
                setNotifications(data || []);
                setLoading(false);
            });
    }, [showDropdown, userId, supabase]);

    // Fetch unread count (for badge)
    useEffect(() => {
        supabase
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
        supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false)
            .then(() => {
                setUnreadCount(0);
                // Optionally update notifications state to reflect read status
                setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
            });
    }, [showDropdown, unreadCount, userId, supabase]);

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

    const handleSignOut = async () => {
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
        <div className="flex flex-col min-h-screen w-full text-white">
            {/* Brand Header Only */}
            <div className="flex flex-col items-center pt-8 pb-4">
                <div className="text-2xl font-bold mb-2">MatchMakr</div>
            </div>
            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
            {/* Bottom Navigation Bar remains unchanged */}
            <nav className="fixed bottom-0 left-0 w-full bg-white/60 backdrop-blur-md shadow-card z-50 border-t border-white/30">
                <div className="flex justify-around items-center py-3">
                    {/* Logout */}
                    <button onClick={handleSignOut} className="flex flex-col items-center text-gray-500 hover:text-primary-blue-light text-xs focus:outline-none">
                        <span>Logout</span>
                    </button>
                    {/* Settings Icon Placeholder */}
                    <button onClick={() => router.push('/dashboard/settings')} className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none">
                        {/* Simple Gear SVG */}
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1z" />
                        </svg>
                        <span>Settings</span>
                    </button>
                    {/* Coffee/Date Ideas Icon Placeholder */}
                    <button className="flex flex-col items-center text-gray-500 hover:text-primary-blue text-xs focus:outline-none">
                        {/* Simple Coffee SVG */}
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                            <rect x="2" y="8" width="16" height="8" rx="4" />
                            <line x1="6" y1="1" x2="6" y2="4" />
                            <line x1="10" y1="1" x2="10" y2="4" />
                            <line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                        <span>Date Ideas</span>
                    </button>
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
                        {/* Notification Dropdown (moved from header) */}
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
                                                    {n.type === 'matchmakr_chat' ? 'Your matchmakr messaged another matchmakr about you!' : n.type}
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
        </div>
    );
} 