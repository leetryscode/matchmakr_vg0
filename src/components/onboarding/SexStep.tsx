'use client';

import React from 'react';

interface SexStepProps {
  onNext: (sex: 'Male' | 'Female') => void;
}

export default function SexStep({ onNext }: SexStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight sm:text-[4rem]">
        Select your sex
      </h1>
      <div className="flex gap-4">
        <button
          onClick={() => onNext('Male')}
          className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline"
        >
          Male
        </button>
        <button
          onClick={() => onNext('Female')}
          className="rounded-cta min-h-[48px] bg-action-secondary text-primary-blue font-semibold hover:bg-action-secondary-hover focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline"
        >
          Female
        </button>
      </div>
    </div>
  );
} 