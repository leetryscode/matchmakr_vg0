'use client';

import React from 'react';

export type OpenToValue = 'men' | 'women' | 'both';

interface OpenToStepProps {
  onNext: (openTo: OpenToValue) => void;
}

const OPTIONS: { value: OpenToValue; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'both', label: 'Both' },
];

export default function OpenToStep({ onNext }: OpenToStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Open to being introduced to
      </h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onNext(opt.value)}
            className="orbit-ring orbit-surface-soft rounded-card-lg px-6 py-4 text-orbit-text card-hover-subtle transition-all duration-200 font-light text-lg"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
