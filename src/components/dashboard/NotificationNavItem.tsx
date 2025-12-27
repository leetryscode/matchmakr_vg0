'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationNavItemProps {
    userId: string;
}

export default function NotificationNavItem({ userId }: NotificationNavItemProps) {
    const supabaseRef = useRef(createClient());
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return (
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
                                <li key={n.id} className={`p-4 ${!n.read ? 'bg-primary-blue/10' : ''}`}>
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
    );
}
