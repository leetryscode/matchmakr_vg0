'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  /** Size variant: hero (home page), header (dashboard), footer, or default */
  size?: 'hero' | 'header' | 'footer' | 'default';
}

/**
 * Reusable brand mark component - Orbit logo (gold on navy).
 * Used in both header and footer for consistent branding.
 */
export default function BrandMark({ className, size = 'default' }: BrandMarkProps) {
  const heightClass = size === 'hero' ? 'h-16 sm:h-20' : size === 'header' ? 'h-6' : size === 'footer' ? 'h-4' : 'h-10';
  return (
    <Image
      src="/logo v3.svg"
      alt="Orbit"
      width={912}
      height={320}
      className={cn('w-auto object-contain', heightClass, className)}
      priority
    />
  );
}

