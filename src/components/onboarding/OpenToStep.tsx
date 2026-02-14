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
      <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight sm:text-[4rem]">
        Open to being introduced to
      </h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onNext(opt.value)}
            className="rounded-xl border border-border-light bg-background-card px-6 py-4 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 focus:ring-offset-background-main font-light text-lg"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
