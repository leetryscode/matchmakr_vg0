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
    'rounded-2xl bg-background-card/60 border border-border-light/40 px-4 py-4 space-y-2',
  accent:
    'rounded-2xl bg-background-card/85 border border-border-light/60 px-4 py-3 shadow-sm space-y-2',
  soft:
    'rounded-2xl bg-background-card/55 border border-border-light/35 px-4 py-4 space-y-2',
  light:
    'rounded-xl bg-background-card/35 border border-border-light/25 px-4 py-3 space-y-2',
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
