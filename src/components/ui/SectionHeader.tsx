'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  title: string;
  right?: React.ReactNode;
  className?: string;
};

export default function SectionHeader({ title, right, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-2', className)}>
      <h2 className="text-xl font-light text-white border-b border-white/20 pb-1 tracking-[0.05em] font-brand">
        {title}
      </h2>
      {right && <div className="ml-4">{right}</div>}
    </div>
  );
}

