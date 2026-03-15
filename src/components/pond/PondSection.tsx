'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type PondSectionVariant = 'default' | 'accent' | 'soft' | 'light';

type PondSectionProps = {
  children: React.ReactNode;
  variant?: PondSectionVariant;
  className?: string;
};

const variantClasses: Record<PondSectionVariant, string> = {
  default:
    'rounded-2xl bg-orbit-surface-2/60 border border-orbit-border/40 px-4 py-4 space-y-2',
  accent:
    'rounded-2xl bg-orbit-surface-2/85 border border-orbit-border/60 px-4 py-3 shadow-sm space-y-2',
  soft:
    'rounded-2xl bg-orbit-surface-2/55 border border-orbit-border/35 px-4 py-4 space-y-2',
  light:
    'rounded-xl bg-orbit-surface-2/35 border border-orbit-border/25 px-4 py-3 space-y-2',
};

export default function PondSection({
  children,
  variant = 'default',
  className,
}: PondSectionProps) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
}
