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
  const baseClasses = 'bg-gradient-to-br from-primary-blue to-primary-teal text-white rounded-pill font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300';
  
  const buttonClasses = cn(
    baseClasses,
    'px-12 py-4 text-xl hover:-translate-y-2 border-2 border-white',
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

