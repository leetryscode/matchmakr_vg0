'use client';

/**
 * Legacy hook for backward compatibility.
 * 
 * This hook now simply re-exports from NotificationsContext.
 * The realtime subscription is managed by NotificationsProvider (mounted in AuthProvider).
 * 
 * @deprecated userId parameter is ignored - notifications come from context based on authenticated user
 */
import { useNotifications as useNotificationsContext } from '@/contexts/NotificationsContext';

// Re-export types for backward compatibility
export type { Notification } from '@/contexts/NotificationsContext';

export interface UseNotificationsResult {
    notifications: import('@/contexts/NotificationsContext').Notification[];
    activeCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAllRead: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
}

/**
 * @param userId - DEPRECATED: This parameter is ignored. Notifications come from context based on authenticated user.
 */
export function useNotifications(userId?: string): UseNotificationsResult {
    // userId parameter is ignored - context provides notifications for the authenticated user
    return useNotificationsContext();
}

