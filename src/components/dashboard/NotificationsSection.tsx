'use client';

import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NotificationsSectionProps {
  userId?: string;
}

const ACK_MS = 260;
const HOLD_MS = 220;
const SLIDE_MS = 420;

/**
 * Shared NotificationsSection component for both Sponsor and Single dashboards.
 * Displays notifications as stacked cards with dismiss functionality.
 */
export default function NotificationsSection({ userId: _userIdProp }: NotificationsSectionProps) {
  const { user } = useAuth();
  // Notifications come from context (NotificationsProvider) - userId prop is ignored
  const { notifications, activeCount, loading, refresh, dismissNotification } = useNotifications();
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [optimisticallyDismissed, setOptimisticallyDismissed] = useState<Set<string>>(new Set());
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const prevActiveCountRef = React.useRef<number>(0);
  // setTimeout returns number in browser; use number for ref to avoid Node/browser type conflicts
  const timeoutsRef = React.useRef<
    Record<string, { ack?: number; dismiss?: number }>
  >({});

  // Refresh notifications when user is present
  useEffect(() => {
    if (user?.id) refresh();
  }, [user?.id, refresh]);

  // Track when section appears (activeCount goes from 0 → 1) for fade-in animation
  useEffect(() => {
    const prev = prevActiveCountRef.current;
    prevActiveCountRef.current = activeCount;

    const wasHidden = prev === 0;
    const isNowVisible = activeCount > 0;

    if (wasHidden && isNowVisible && !loading) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 300);
      return () => clearTimeout(timer);
    }

    if (activeCount === 0) {
      setShouldAnimate(false);
    }
  }, [activeCount, loading]);

  // Handle hash navigation - scroll to notifications element when URL has #notifications
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#notifications') return;
    if (loading) return;
    document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach((t) => {
        if (t?.ack) clearTimeout(t.ack);
        if (t?.dismiss) clearTimeout(t.dismiss);
      });
    };
  }, []);

  // Clear optimisticallyDismissed for ids no longer in notifications (after refresh)
  useEffect(() => {
    const notifIds = new Set(notifications.map((n) => n.id));
    setOptimisticallyDismissed((prev) => {
      const next = new Set(prev);
      let changed = false;
      prev.forEach((id) => {
        if (!notifIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [notifications]);

  // Early return if no user
  if (!user) {
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
    setIsSeeding(true);
    try {
      const response = await fetch('/api/debug/notifications/seed', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to seed notification');
      }

      await refresh();
      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('Error seeding notification:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDismiss = (notificationId: string) => {
    if (acknowledging.has(notificationId) || dismissing.has(notificationId)) return;

    // Defensive: clear any existing timeouts for this id
    const existing = timeoutsRef.current[notificationId];
    if (existing?.ack) clearTimeout(existing.ack);
    if (existing?.dismiss) clearTimeout(existing.dismiss);

    // Phase 1: acknowledge
    setAcknowledging((prev) => new Set(prev).add(notificationId));

    const ackId = window.setTimeout(() => {
      setAcknowledging((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      setDismissing((prev) => new Set(prev).add(notificationId));
      setOptimisticallyDismissed((prev) => new Set(prev).add(notificationId));

      const dismissId = window.setTimeout(() => {
        setDismissing((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });

        dismissNotification(notificationId)
          .catch(() => {
            setOptimisticallyDismissed((prev) => {
              const next = new Set(prev);
              next.delete(notificationId);
              return next;
            });
          })
          .finally(() => {
            delete timeoutsRef.current[notificationId];
          });
      }, SLIDE_MS);

      timeoutsRef.current[notificationId] = { dismiss: dismissId };
    }, ACK_MS + HOLD_MS);

    timeoutsRef.current[notificationId] = { ack: ackId };
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
      case 'introduction_live':
        return 'Introduction live';
      case 'nudge_invite_sponsor':
        return 'Invite a sponsor';
      case 'nudge_invite_single':
        return 'Sponsor a single';
      case 'sponsor_updated_profile':
        return 'Profile updated';
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
    if (notification.type === 'introduction_live') {
      const a = notification.data?.single_a_name;
      const b = notification.data?.single_b_name;
      if (a && b) {
        return `Both sponsors agreed to introduce ${a} and ${b}.`;
      }
      return 'Both sponsors agreed — the introduction is live.';
    }
    if (notification.type === 'nudge_invite_sponsor') {
      return 'Invite a trusted sponsor to get started.';
    }
    if (notification.type === 'nudge_invite_single') {
      return 'Invite a single to sponsor so you can start making introductions.';
    }
    if (notification.type === 'sponsor_updated_profile') {
      return 'Your sponsor made a change to your profile.';
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
            disabled={isSeeding}
            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? 'Adding…' : 'Add example'}
          </button>
        </div>
      )}
      {loading ? (
        <div className="flex flex-col gap-3">
          <GlassCard variant="soft" className="p-4">
            <div className="text-center py-2">
              <p className="type-meta">Loading notifications...</p>
            </div>
          </GlassCard>
        </div>
      ) : (() => {
        // Dismissing overrides filter: keep cards in DOM so slide animation can run
        const visibleNotifications = notifications.filter((n) => {
          if (dismissing.has(n.id)) return true;
          if (optimisticallyDismissed.has(n.id)) return false;
          return true;
        });
        if (visibleNotifications.length === 0) {
          return (
            <div className="flex flex-col gap-3">
              <GlassCard variant="soft" className="p-4">
                <div className="text-center py-2">
                  <p className="type-meta">No notifications yet.</p>
                  {isDevMode && (
                    <p className="type-meta text-white/50 mt-2">Use "Add example" button above to create one.</p>
                  )}
                </div>
              </GlassCard>
            </div>
          );
        }
        const lastIndex = visibleNotifications.length - 1;
        const stackDisabled = dismissing.size > 0 || acknowledging.size > 0;
        return (
          <div
            className={cn(
              'relative overflow-visible',
              stackDisabled && 'pointer-events-none'
            )}
          >
            {visibleNotifications.map((notification, idx) => {
              const isTop = idx === lastIndex;
              const distFromTop = lastIndex - idx;
              const depthY = distFromTop === 0 ? 0 : distFromTop === 1 ? 6 : 12;
              const depthOpacity = distFromTop === 0 ? 100 : distFromTop === 1 ? 85 : 70;
              const depthScale = distFromTop === 0 ? 1 : 0.99;
              const isAcknowledging = acknowledging.has(notification.id);
              const isDismissing = dismissing.has(notification.id);
              return (
                <div
                  key={notification.id}
                  className={cn(
                    isTop ? 'relative' : 'absolute top-0 inset-x-0',
                    !isTop && 'pointer-events-none'
                  )}
                  style={{
                    zIndex: 1000 + idx,
                    transform: `translateY(${depthY}px) scale(${depthScale})`,
                    opacity: depthOpacity / 100,
                  }}
                  aria-hidden={!isTop}
                  inert={!isTop || undefined}
                  tabIndex={!isTop ? -1 : undefined}
                >
                  <GlassCard
                    variant="soft"
                    className={`p-4 relative transition-[transform,opacity] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                      isDismissing
                        ? '-translate-x-[140%] opacity-0 scale-[0.99] pointer-events-none'
                        : 'translate-x-0 opacity-100 scale-100'
                    }`}
                    style={{
                      transitionDuration: `${SLIDE_MS}ms`,
                      ...(isDismissing ? { willChange: 'transform, opacity' as const } : {}),
                    }}
                  >
                    {/* Dismiss button - boxed checkmark, status pill green on ACK */}
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      disabled={isAcknowledging || isDismissing}
                      className={`absolute top-4 right-3 p-1.5 rounded-md border transition-all ease-out focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 ${
                        isAcknowledging
                          ? 'bg-status-in-motion/20 border-status-in-motion/50 scale-[1.06]'
                          : 'bg-transparent border-orbit-border/50 hover:bg-orbit-border/20 hover:border-orbit-border/70'
                      } ${isDismissing ? 'opacity-60' : 'opacity-100'}`}
                      style={{ transitionDuration: `${ACK_MS}ms` }}
                      aria-label="Dismiss notification"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={isAcknowledging ? 2.75 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-all ease-out ${
                          isAcknowledging ? 'text-orbit-text scale-[1.06]' : 'text-orbit-muted hover:text-orbit-text'
                        }`}
                        style={{ transitionDuration: `${ACK_MS}ms` }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>

                    {/* Notification content */}
                    <div className="pr-8">
                      <h3 className="type-body font-semibold text-orbit-text mb-1.5">
                        {getNotificationTitle(notification.type)}
                      </h3>
                      <p className="type-meta orbit-muted">
                        {getNotificationBody(notification)}
                      </p>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
