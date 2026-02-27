'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InviteSingleReferralRowProps {
  onClick: () => void;
  className?: string;
}

/**
 * Clickable row for Single → Single referral invite.
 * Same layout as PreviewRow; "+" icon instead of profile pic.
 * Opens invite modal on click.
 */
export default function InviteSingleReferralRow({ onClick, className }: InviteSingleReferralRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className={cn('mt-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'ui-rowcard flex items-center gap-3',
          'rounded-card-lg shadow-card px-5 py-3',
          'border border-orbit-border/50',
          'cursor-pointer hover:bg-orbit-border/20 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2'
        )}
        aria-label="Help grow Orbit - Invite someone you trust to join Orbit"
      >
        {/* Avatar: "+" in circle */}
        <div
          className={cn(
            'w-12 h-12 rounded-full overflow-hidden border-2 border-orbit-border/50 orbit-surface flex-shrink-0',
            'flex items-center justify-center text-orbit-muted text-2xl font-light'
          )}
          aria-hidden
        >
          +
        </div>

        <div className="flex-1 min-w-0">
          <div className="type-body truncate text-orbit-text">Help grow Orbit</div>
          <div className="type-meta truncate text-orbit-muted">
            Invite someone you trust to join Orbit
          </div>
        </div>
      </div>
    </div>
  );
}
