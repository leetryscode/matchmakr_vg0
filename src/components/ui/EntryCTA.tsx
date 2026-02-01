'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type EntryCTAProps = {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
};

/** Entry CTA: white fill, slate blue text. For home, login, and other pre-dashboard flows only. */
const entryCtaClasses =
  'rounded-cta min-h-[48px] bg-action-entry text-primary-blue font-semibold shadow-cta-entry ' +
  'hover:bg-action-entry-hover active:bg-action-entry-active ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 ' +
  'px-6 py-3 text-base tracking-[0.02em] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-entry';

export default function EntryCTA({ children, onClick, href, className, disabled }: EntryCTAProps) {
  const buttonClasses = cn(entryCtaClasses, className);

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <button type="button" className={buttonClasses} onClick={onClick} disabled={disabled}>
          {children}
        </button>
      </Link>
    );
  }

  return (
    <button type="button" className={buttonClasses} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
