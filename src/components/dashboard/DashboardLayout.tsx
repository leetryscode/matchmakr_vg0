'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName: string | null;
    userId: string;
    userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardLayout({ children, firstName, userId, userType }: DashboardLayoutProps) {
    const router = useRouter();
    const supabase = createClient();

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
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-main text-gray-800">
            {/* Modern Gradient Header */}
            <header className="bg-gradient-primary text-white text-center py-10 px-4 rounded-b-2xl shadow-header relative">
                {/* Notification Bell Icon */}
                <button
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 focus:outline-none"
                    aria-label="Notifications"
                    onClick={() => setShowDropdown(v => !v)}
                >
                    {/* Simple SVG Bell */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-lg border-2 border-white animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </button>
                {/* Notification Dropdown */}
                {showDropdown && (
                    <div ref={dropdownRef} className="absolute right-6 top-16 w-80 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in">
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
                                        {/* Optionally show more info from n.data */}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                <h1 className="font-inter font-bold text-3xl mb-2">
                    Hello, <span className="text-accent-teal-light font-semibold">{firstName || 'User'}</span>, welcome to MatchMakr
                </h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Modern Bottom Navigation */}
            <footer className="bg-background-card shadow-card p-6 mt-auto">
                <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6 text-center">
                    <button 
                        onClick={() => router.push(`/profile/${userId}`)}
                        className="bg-gradient-primary text-white p-6 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-primary-blue"
                    >
                        <div className="font-inter font-bold text-2xl mb-2">My Profile</div>
                        <div className="font-raleway text-sm opacity-90">Edit your matchmaking profile</div>
                    </button>
                    <button 
                        onClick={() => router.push(userType === 'MATCHMAKR' ? '/pond' : '/dates')}
                        className="bg-gradient-light text-white p-6 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-accent-blue-light"
                    >
                        <div className="font-inter font-bold text-2xl mb-2">
                            {userType === 'MATCHMAKR' ? 'The Pond' : 'Discover Dates'}
                        </div>
                        <div className="font-raleway text-sm opacity-90">
                            {userType === 'MATCHMAKR' ? 'Browse singles in your area' : 'Find perfect matches nearby'}
                        </div>
                    </button>
                </div>
                <div className="mt-6 flex justify-around text-sm text-gray-500">
                    <button onClick={() => router.push('/settings')} className="hover:text-primary-blue hover:underline transition-colors">Account Setting</button>
                    <button onClick={handleSignOut} className="hover:text-primary-blue-light hover:underline transition-colors">Log out</button>
                </div>
            </footer>
        </div>
    );
} 