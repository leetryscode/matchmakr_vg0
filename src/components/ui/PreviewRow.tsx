'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type PreviewRowAvatarType = 'generic' | 'blurred' | 'illustration';

export interface PreviewRowProps {
  /** Row title (e.g. contact name) */
  title: string;
  /** Row subtitle (e.g. "Introduced by Paula") */
  subtitle: string;
  /** Optional muted label under the row (e.g. "Preview") */
  label?: string;
  /** Avatar style for future variants; currently only generic is used */
  avatarType?: PreviewRowAvatarType;
  className?: string;
}

/**
 * Non-interactive chat-row-style preview for empty states.
 * Same layout as real chat rows (padding, avatar size, typography) but inert:
 * no click, no hover, no timestamps/badges. Visually muted.
 * Use for cold-start sections (e.g. Introduced by my sponsor, Chat with sponsor, Notifications).
 */
export default function PreviewRow({
  title,
  subtitle,
  label,
  avatarType = 'generic',
  className,
}: PreviewRowProps) {
  return (
    <div className={cn('relative', label ? 'mb-5' : '', className)}>
      <div
        className={cn(
          'ui-rowcard flex items-center gap-3 select-none',
          'opacity-[0.88] cursor-default pointer-events-none',
          'rounded-card-lg shadow-card px-5 py-3',
          'border border-border-light/60'
        )}
        role="presentation"
        aria-disabled="true"
        aria-hidden="true"
      >
        {/* Avatar: generic placeholder (no real user) */}
        <div
          className={cn(
            'w-12 h-12 rounded-full overflow-hidden border-2 border-orbit-border/50 orbit-surface flex-shrink-0',
            'flex items-center justify-center text-text-light'
          )}
          aria-hidden
        >
          {avatarType === 'generic' && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-light"
            >
              <circle cx="12" cy="8" r="3" />
              <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="type-body truncate text-text-dark/90">{title}</div>
          <div className="type-meta orbit-muted truncate">{subtitle}</div>
        </div>

        {/* No timestamp, no unread badge, no menu */}
      </div>

      {label && (
        <div
          className="mt-1.5 pl-5 type-meta orbit-muted text-[10px] uppercase tracking-wider"
          aria-hidden
        >
          {label}
        </div>
      )}
    </div>
  );
}
