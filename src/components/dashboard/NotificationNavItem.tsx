'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationNavItemProps {
    userId: string;
    pathname: string;
}

export default function NotificationNavItem({ userId, pathname }: NotificationNavItemProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, loading, refresh, markAllRead } = useNotifications(userId);
    
    // Notifications is active when dropdown is open (no dedicated route)
    const isActive = showDropdown;

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (showDropdown) {
            refresh();
        }
    }, [showDropdown, refresh]);

    // Mark notifications as read when dropdown opens
    useEffect(() => {
        if (showDropdown && unreadCount > 0) {
            markAllRead();
        }
    }, [showDropdown, unreadCount, markAllRead]);

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
        <div className="relative flex flex-col items-center justify-center min-w-[44px]">
            <button
                className="flex flex-col items-center justify-center focus:outline-none relative"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setShowDropdown(v => !v)}
            >
                {/* Bell SVG */}
                <div className={`flex items-center justify-center transition-colors ${isActive ? 'text-white' : 'text-white/75 hover:text-white'}`} style={{ width: '22px', height: '22px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </div>
                <span className={`text-[10px] leading-none mt-1 ${isActive ? 'text-white/65' : 'text-white/60'}`}>Notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-lg border-2 border-white animate-pulse" style={{transform: 'translate(50%,-50%)'}}>
                        {unreadCount}
                    </span>
                )}
            </button>
            {/* Notification Dropdown - anchored to bell button, opens upward */}
            {showDropdown && (
                <div ref={dropdownRef} className="absolute bottom-full right-0 mb-2 w-80 bg-white text-gray-900 rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in">
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
