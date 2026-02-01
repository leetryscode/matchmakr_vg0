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
  const baseClasses = 'rounded-cta bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200';
  
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

