'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    read: boolean;
    created_at: string;
    data?: any;
}

export interface UseNotificationsResult {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAllRead: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
}

export function useNotifications(userId: string): UseNotificationsResult {
    const supabaseRef = useRef(createClient());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count on mount and when userId changes
    useEffect(() => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }

        // Fetch unread count
        supabaseRef.current
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false)
            .then(({ count }) => setUnreadCount(count || 0));
    }, [userId]);

    // Fetch notifications (called by UI when needed)
    // Only fetch unread notifications (read=false)
    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabaseRef.current
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .eq('read', false)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching notifications:', error);
                setNotifications([]);
            } else {
                setNotifications(data || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Mark all unread notifications as read
    const markAllRead = useCallback(async () => {
        if (!userId || unreadCount === 0) return;

        try {
            const { error } = await supabaseRef.current
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) {
                console.error('Error marking notifications as read:', error);
            } else {
                setUnreadCount(0);
                // Update notifications state to reflect read status
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }, [userId, unreadCount]);

    // Dismiss a single notification (set read=true)
    const dismissNotification = useCallback(async (notificationId: string) => {
        if (!userId) return;

        try {
            const { error } = await supabaseRef.current
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error dismissing notification:', error);
            } else {
                // Optimistically remove from state
                setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
                // Update unread count
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }, [userId]);

    return {
        notifications,
        unreadCount,
        loading,
        refresh,
        markAllRead,
        dismissNotification,
    };
}

