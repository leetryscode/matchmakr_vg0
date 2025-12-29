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
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <h2 className="type-section border-b border-white/20 pb-1">
        {title}
      </h2>
      {right && <div className="ml-4 type-meta">{right}</div>}
    </div>
  );
}

