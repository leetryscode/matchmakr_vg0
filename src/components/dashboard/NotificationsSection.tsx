'use client';

import React from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import GlassCard from '@/components/ui/GlassCard';

/**
 * Shared NotificationsSection component for both Sponsor and Single dashboards.
 * This ensures consistent styling, behavior, and performance across both dashboards.
 * When notifications functionality is implemented, update this single component.
 */
export default function NotificationsSection() {
  return (
    <div>
      <SectionHeader title="Notifications" />
      <GlassCard variant="1" className="p-4">
        <div className="text-center py-2">
          <p className="type-meta">No notifications yet.</p>
        </div>
      </GlassCard>
    </div>
  );
}

