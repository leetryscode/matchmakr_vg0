'use client';

import React, { useEffect, useState } from 'react';
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
  
  const { notifications, activeCount, loading, refresh, dismissNotification } = useNotifications(userId);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevActiveCountRef = React.useRef<number>(0);

  // Refresh notifications on mount
  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  // Track when section appears (activeCount goes from 0 → 1) for fade-in animation
  useEffect(() => {
    const wasHidden = prevActiveCountRef.current === 0;
    const isNowVisible = activeCount > 0;
    
    if (wasHidden && isNowVisible && !loading) {
      // Section is appearing for the first time - trigger fade-in animation
      // Works in both production and dev mode
      setShouldAnimate(true);
      // Reset animation flag after animation completes (300ms)
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 300);
      return () => clearTimeout(timer);
    } else if (activeCount === 0) {
      // Section is hidden - reset animation state
      setShouldAnimate(false);
    }
    
    prevActiveCountRef.current = activeCount;
  }, [activeCount, loading]);

  // Handle hash navigation - scroll to top if URL has #notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#notifications') {
      // Small delay to ensure DOM is ready, then scroll to top
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [notifications]); // Re-run when notifications load/change

  // Early return if no userId
  if (!userId) {
    return null;
  }

  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ORBIT_DEBUG_UI === 'true';

  // In production (debug flag off), hide entire section when no active notifications
  // In dev/debug mode, keep section visible for testing
  if (!isDevMode && activeCount === 0 && !loading) {
    return null;
  }

  // Animation runs when section first appears (works in both production and dev mode)
  const showAnimation = shouldAnimate;

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
      
      // Scroll to top of page (same view as when dashboard opens)
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
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
      case 'intro_created':
        return 'New introduction';
      case 'sponsor_logged_in':
        return 'Sponsor activity';
      case 'single_not_seen_intro':
        return 'Introduction not yet viewed';
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
    if (notification.type === 'intro_created') {
      return 'Your sponsor introduced you to someone new.';
    }
    if (notification.type === 'sponsor_logged_in') {
      // Use the message stored in data, or fallback to default
      return (
        notification.data?.message ||
        'Your sponsor is spending time in Orbit.'
      );
    }
    if (notification.type === 'single_not_seen_intro') {
      return "Your single hasn't logged in yet to view the introduction.";
    }
    return notification.data?.message || 'You have a new notification.';
  };

  return (
    <div 
      id="notifications"
      className={showAnimation ? 'animate-[fadeIn_300ms_ease-out_forwards]' : ''}
    >
      {isDevMode && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={handleSeedNotification}
            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            Add example
          </button>
        </div>
      )}
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
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
