'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = {
  children: React.ReactNode;
  variant?: '1' | '2';
  className?: string;
  style?: React.CSSProperties;
};

export default function GlassCard({ children, variant = '1', className, style }: GlassCardProps) {
  const baseClasses = 'rounded-card-lg bg-background-card shadow-card';
  const variantClasses = variant === '1' 
    ? ''
    : 'shadow-card-hover';

  return (
    <div className={cn(baseClasses, variantClasses, className)} style={style}>
      {children}
    </div>
  );
}

