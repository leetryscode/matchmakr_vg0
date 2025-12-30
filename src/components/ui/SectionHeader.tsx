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
    <div className={cn('flex items-center justify-between mb-3 mt-8 first:mt-0', className)}>
      <h2 className="type-section">
        {title}
      </h2>
      {right && <div className="ml-4 flex items-center">{right}</div>}
    </div>
  );
}

