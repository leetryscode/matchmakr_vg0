'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    read: boolean;
    dismissed_at: string | null;
    created_at: string;
    data?: any;
}

interface NotificationsContextType {
    notifications: Notification[];
    activeCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAllRead: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/**
 * NotificationsProvider manages a single Supabase Realtime subscription for notifications.
 * This ensures only ONE subscription exists per user, preventing duplicate subscription errors.
 * 
 * Mounted inside AuthProvider, so it only exists for authenticated users.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading, userType, sponsoredById } = useAuth();
    const userId = user?.id || null;
    
    const supabase = getSupabaseClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCount, setActiveCount] = useState(0);
    
    // Refs for realtime subscription management
    const channelRef = useRef<any>(null);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const instanceIdRef = useRef<string>(`notifications-provider-${Math.random().toString(36).substr(2, 9)}`);

    // Fetch active count on mount and when userId changes
    useEffect(() => {
        if (!userId) {
            setActiveCount(0);
            return;
        }

        // Fetch active count (dismissed_at IS NULL)
        // Compatibility: Also exclude read=true notifications during transition
        supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('dismissed_at', null)
            .or('read.is.null,read.eq.false')
            .then(({ count }) => setActiveCount(count || 0));
    }, [userId, supabase]);

    // Sponsor-related notification types (defense-in-depth: hide if single has no sponsor)
    const SPONSOR_NOTIF_TYPES = new Set(['sponsor_logged_in', 'matchmakr_chat', 'sponsor_updated_profile']);

    // Fetch notifications (called by UI when needed)
    const refresh = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            setActiveCount(0);
            return;
        }

        setLoading(true);
        try {
            const { data: rawNotifications, error } = await supabase
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
                let notifications = rawNotifications || [];

                // Defense-in-depth: hide sponsor-related notifications for Singles without a sponsor
                // Uses profile from AuthContext (fetched at boot) - no extra round-trip
                const isSingleWithoutSponsor = userType === 'SINGLE' && !sponsoredById;
                if (isSingleWithoutSponsor) {
                    const before = notifications.length;
                    notifications = notifications.filter((n) => !SPONSOR_NOTIF_TYPES.has(n.type));
                    const filtered = before - notifications.length;
                    if (filtered > 0 && process.env.NODE_ENV !== 'production') {
                        console.warn(`[Notifications] filteredSponsorNotifWithoutSponsor: ${filtered} notification(s) hidden (single has no sponsor)`);
                    }
                }

                setNotifications(notifications);
                setActiveCount(notifications.length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
            setActiveCount(0);
        } finally {
            setLoading(false);
        }
    }, [userId, userType, sponsoredById, supabase]);

    // Mark all active notifications as read
    const markAllRead = useCallback(async () => {
        if (!userId || activeCount === 0) return;

        try {
            const { error } = await supabase
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
    }, [userId, activeCount, refresh, supabase]);

    // Dismiss a single notification (set dismissed_at = now())
    const dismissNotification = useCallback(async (notificationId: string) => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ dismissed_at: new Date().toISOString() })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error dismissing notification:', error);
            } else {
                // Optimistically remove from state for immediate UI feedback
                setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
                // Refresh to get accurate activeCount
                await refresh();
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }, [userId, refresh, supabase]);

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

    // Real-time subscription for notifications - ONLY ONE SUBSCRIPTION PER USER
    useEffect(() => {
        // Gate on both userId AND auth not loading to prevent thrash during auth transitions
        if (authLoading || !userId) {
            // Clean up if userId becomes null or auth is still loading
            if (channelRef.current) {
                console.log(`[REALTIME-DEBUG] ${instanceIdRef.current} | NotificationsProvider | CLEANUP | authLoading=${authLoading} userId=${userId}`);
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            return;
        }

        const channelName = `notifications:${userId}`;
        const instanceId = instanceIdRef.current;
        
        console.log(`[REALTIME-DEBUG] ${instanceId} | NotificationsProvider | SUBSCRIBE | channel: ${channelName}`);

        // Cleanup previous channel if exists (guard against double-subscribe)
        if (channelRef.current) {
            console.log(`[REALTIME-DEBUG] ${instanceId} | NotificationsProvider | CLEANUP-PREV | channel: ${channelName}`);
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase
            .channel(channelName) // Unique channel per user
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
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
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    // On any UPDATE, refresh to get accurate state
                    debouncedRefresh();
                }
            )
            .subscribe((status) => {
                console.log(`[REALTIME-DEBUG] ${instanceId} | NotificationsProvider | SUBSCRIBE-STATUS | channel: ${channelName} | status: ${status}`);
            });

        channelRef.current = channel;

        return () => {
            // Cleanup: clear any pending refresh timer
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            if (channelRef.current) {
                console.log(`[REALTIME-DEBUG] ${instanceId} | NotificationsProvider | CLEANUP | channel: ${channelName}`);
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId, authLoading, debouncedRefresh, supabase]);

    const value: NotificationsContextType = {
        notifications,
        activeCount,
        loading,
        refresh,
        markAllRead,
        dismissNotification,
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsContextType {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}

