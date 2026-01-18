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
    
    // Debounce timer ref for realtime events
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null); // Track channel to prevent double-subscribe

    // Fetch active count on mount and when userId changes
    // Active = dismissed_at IS NULL AND (read IS NULL OR read = false) for compatibility
    useEffect(() => {
        if (!userId) {
            setActiveCount(0);
            return;
        }

        // Fetch active count (dismissed_at IS NULL)
        // Compatibility: Also exclude read=true notifications during transition
        supabaseRef.current
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('dismissed_at', null)
            .or('read.is.null,read.eq.false')
            .then(({ count }) => setActiveCount(count || 0));
    }, [userId]);

    // Fetch notifications (called by UI when needed)
    // Stable callback with correct dependencies
    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            setActiveCount(0);
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
                setActiveCount(0);
            } else {
                setNotifications(data || []);
                // Derive activeCount from refreshed data
                setActiveCount(data?.length || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
            setActiveCount(0);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Mark all active notifications as read
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
                // Refresh to get accurate state
                await refresh();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }, [userId, activeCount, refresh]);

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
                // Optimistically remove from state for immediate UI feedback
                setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
                // Refresh to get accurate activeCount (removed manual decrement)
                await refresh();
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }, [userId, refresh]);

    // Debounced refresh helper for realtime events
    const debouncedRefresh = useCallback(() => {
        // Clear existing timer
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
        
        // Schedule refresh after 200ms, coalescing multiple events
        refreshTimerRef.current = setTimeout(() => {
            refresh();
        }, 200);
    }, [refresh]);

    // Real-time subscription for notifications
    useEffect(() => {
        if (!userId) return;

        // Cleanup previous channel if exists (guard against double-subscribe)
        if (channelRef.current) {
            supabaseRef.current.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabaseRef.current
            .channel(`notifications:${userId}`) // Unique channel per user
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // Only INSERT and UPDATE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    // Only trigger refresh if notification is active
                    if (!newNotification.dismissed_at && !newNotification.read) {
                        debouncedRefresh();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Only INSERT and UPDATE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // On any UPDATE, refresh to get accurate state
                    debouncedRefresh();
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            // Cleanup: clear any pending refresh timer
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            if (channelRef.current) {
                supabaseRef.current.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId, debouncedRefresh]); // debouncedRefresh is stable due to useCallback

    return {
        notifications,
        activeCount,
        loading,
        refresh,
        markAllRead,
        dismissNotification,
    };
}

