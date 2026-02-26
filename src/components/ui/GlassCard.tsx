'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = {
  children: React.ReactNode;
  variant?: '1' | '2' | 'soft';
  className?: string;
  style?: React.CSSProperties;
};

export default function GlassCard({ children, variant = '1', className, style }: GlassCardProps) {
  const baseClasses = variant === 'soft' ? 'orbit-surface-soft rounded-card-lg shadow-sm' : 'orbit-card';
  const variantClasses = variant === '2' ? 'shadow-card-hover' : '';

  return (
    <div className={cn(baseClasses, variantClasses, className)} style={style}>
      {children}
    </div>
  );
}

