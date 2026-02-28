'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
}

/**
 * Reusable brand mark component - single source of truth for brand label.
 * Used in both header and footer for consistent branding.
 */
export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn('tracking-[0.15em] uppercase font-orbit-heading text-orbit-muted text-sm', className)}>
      ORBIT
    </div>
  );
}
