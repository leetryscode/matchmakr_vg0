'use client';

import React, { useState } from 'react';

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
  const [selectedOpenTo, setSelectedOpenTo] = useState<OpenToValue | null>(null);

  return (
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          Open to meeting
        </h1>
        <div className="w-full max-w-md">
          <div className="flex gap-4">
            {OPTIONS.slice(0, 2).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedOpenTo(opt.value)}
                className={`onboarding-selection flex-1 text-center ${selectedOpenTo === opt.value ? 'onboarding-selection-active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setSelectedOpenTo(OPTIONS[2].value)}
              className={`onboarding-selection w-[48%] text-center ${selectedOpenTo === OPTIONS[2].value ? 'onboarding-selection-active' : ''}`}
            >
              {OPTIONS[2].label}
            </button>
          </div>
        </div>
      </div>
      <div className="onboarding-step-actions">
        <button
          onClick={() => selectedOpenTo && onNext(selectedOpenTo)}
          disabled={!selectedOpenTo}
          className="onboarding-btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
