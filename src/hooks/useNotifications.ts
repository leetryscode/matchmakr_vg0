'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    read: boolean;
    dismissed_at: string | null;
    created_at: string;
    data?: any;
}

export interface UseNotificationsResult {
    notifications: Notification[];
    activeCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAllRead: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
}

export function useNotifications(userId: string): UseNotificationsResult {
    const supabaseRef = useRef(createClient());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCount, setActiveCount] = useState(0);

    // Fetch active count on mount and when userId changes
    // Active = dismissed_at IS NULL AND (read IS NULL OR read = false) for compatibility
    useEffect(() => {
        if (!userId) {
            setActiveCount(0);
            return;
        }

        // Fetch active count (dismissed_at IS NULL)
        // Compatibility: Also exclude read=true notifications during transition
        // Note: We filter by dismissed_at first, then apply OR filter for read compatibility
        supabaseRef.current
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('dismissed_at', null)
            .or('read.is.null,read.eq.false')
            .then(({ count }) => setActiveCount(count || 0));
    }, [userId]);

    // Fetch notifications (called by UI when needed)
    // Only fetch active notifications (dismissed_at IS NULL)
    // Compatibility: Also exclude read=true notifications during transition
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
                .is('dismissed_at', null)
                .or('read.is.null,read.eq.false')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching notifications:', error);
                setNotifications([]);
            } else {
                setNotifications(data || []);
                // Update active count
                setActiveCount(data?.length || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Mark all active notifications as read
    // Note: This still uses the read column, but dismissal now uses dismissed_at
    const markAllRead = useCallback(async () => {
        if (!userId || activeCount === 0) return;

        try {
            const { error } = await supabaseRef.current
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .is('dismissed_at', null)
                .or('read.is.null,read.eq.false');

            if (error) {
                console.error('Error marking notifications as read:', error);
            } else {
                setActiveCount(0);
                // Update notifications state to reflect read status
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }, [userId, activeCount]);

    // Dismiss a single notification (set dismissed_at = now())
    const dismissNotification = useCallback(async (notificationId: string) => {
        if (!userId) return;

        try {
            const { error } = await supabaseRef.current
                .from('notifications')
                .update({ dismissed_at: new Date().toISOString() })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error dismissing notification:', error);
            } else {
                // Optimistically remove from state
                setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
                // Update active count
                setActiveCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }, [userId]);

    return {
        notifications,
        activeCount,
        loading,
        refresh,
        markAllRead,
        dismissNotification,
    };
}

