'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type PrimaryCTAProps = {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
};

export default function PrimaryCTA({ children, onClick, href, className }: PrimaryCTAProps) {
  const baseClasses = 'orbit-ring rounded-cta bg-orbit-gold text-orbit-bg-start font-semibold shadow-cta-entry hover:bg-orbit-goldDark active:bg-orbit-goldDark/90 transition-colors duration-200';
  
  const buttonClasses = cn(
    baseClasses,
    'px-12 py-4 text-xl min-h-[48px] tracking-[0.02em]',
    className
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <button className={buttonClasses} onClick={onClick}>
          {children}
        </button>
      </Link>
    );
  }

  return (
    <button className={buttonClasses} onClick={onClick}>
      {children}
    </button>
  );
}

