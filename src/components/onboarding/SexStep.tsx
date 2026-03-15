'use client';

import React, { useState } from 'react';

interface SexStepProps {
  onNext: (sex: 'Male' | 'Female') => void;
}

export default function SexStep({ onNext }: SexStepProps) {
  const [selectedSex, setSelectedSex] = useState<'Male' | 'Female' | null>(null);

  return (
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          What's your sex?
        </h1>
        <div className="flex w-full max-w-md gap-4">
        <button
          onClick={() => setSelectedSex('Male')}
          className={`onboarding-selection flex-1 text-center ${selectedSex === 'Male' ? 'onboarding-selection-active' : ''}`}
        >
          Male
        </button>
        <button
          onClick={() => setSelectedSex('Female')}
          className={`onboarding-selection flex-1 text-center ${selectedSex === 'Female' ? 'onboarding-selection-active' : ''}`}
        >
          Female
        </button>
      </div>
      </div>
      <div className="onboarding-step-actions">
        <button
          onClick={() => selectedSex && onNext(selectedSex)}
          disabled={!selectedSex}
          className="onboarding-btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
} 