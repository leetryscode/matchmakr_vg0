'use client';

import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import GlassCard from '@/components/ui/GlassCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationsSectionProps {
  userId?: string;
}

/**
 * Shared NotificationsSection component for both Sponsor and Single dashboards.
 * Displays notifications as stacked cards with dismiss functionality.
 */
export default function NotificationsSection({ userId: userIdProp }: NotificationsSectionProps) {
  const { user } = useAuth();
  const userId = userIdProp || user?.id || '';
  
  const { notifications, unreadCount, loading, refresh, dismissNotification } = useNotifications(userId);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Refresh notifications on mount
  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  // Temporarily always render section for testing (removed early return)
  if (!userId) {
    return null;
  }

  const handleSeedNotification = async () => {
    try {
      const response = await fetch('/api/debug/notifications/seed', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to seed notification');
      }
      
      // Refresh notifications after seeding
      await refresh();
    } catch (error) {
      console.error('Error seeding notification:', error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    setDismissing((prev) => new Set(prev).add(notificationId));
    await dismissNotification(notificationId);
    setDismissing((prev) => {
      const next = new Set(prev);
      next.delete(notificationId);
      return next;
    });
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'system_reassurance':
        return 'System Update';
      case 'matchmakr_chat':
        return 'Sponsor Activity';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getNotificationBody = (notification: { type: string; data?: any }) => {
    if (notification.type === 'system_reassurance' && notification.data?.message) {
      return notification.data.message;
    }
    if (notification.type === 'matchmakr_chat') {
      return notification.data?.message || 'Your sponsor is talking to another sponsor about you.';
    }
    return notification.data?.message || 'You have a new notification.';
  };

  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ORBIT_DEBUG_UI === 'true';

  return (
    <div>
      <SectionHeader 
        title="Notifications"
        right={isDevMode ? (
          <button
            onClick={handleSeedNotification}
            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            Add example
          </button>
        ) : undefined}
      />
      <div className="flex flex-col gap-3">
        {loading ? (
          <GlassCard variant="1" className="p-4">
            <div className="text-center py-2">
              <p className="type-meta">Loading notifications...</p>
            </div>
          </GlassCard>
        ) : notifications.length === 0 ? (
          <GlassCard variant="1" className="p-4">
            <div className="text-center py-2">
              <p className="type-meta">No notifications yet.</p>
              {isDevMode && (
                <p className="type-meta text-white/50 mt-2">Use "Add example" button above to create one.</p>
              )}
            </div>
          </GlassCard>
        ) : (
          notifications.map((notification) => {
            const isDismissing = dismissing.has(notification.id);
            return (
              <GlassCard
                key={notification.id}
                variant="1"
                className={`p-4 relative transition-all duration-200 ${
                  isDismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                {/* Dismiss button - top right checkmark */}
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="Dismiss notification"
                  disabled={isDismissing}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/70 hover:text-white"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>

                {/* Notification content */}
                <div className="pr-8">
                  <h3 className="type-body font-semibold text-white/90 mb-1.5">
                    {getNotificationTitle(notification.type)}
                  </h3>
                  <p className="type-meta text-white/70">
                    {getNotificationBody(notification)}
                  </p>
                  <div className="mt-2 text-xs text-white/50">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
