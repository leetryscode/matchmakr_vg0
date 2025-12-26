'use client';

import React from 'react';

interface SexStepProps {
  onNext: (sex: 'Male' | 'Female') => void;
}

export default function SexStep({ onNext }: SexStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light bg-gradient-primary bg-clip-text text-transparent leading-[1.1] tracking-tight sm:text-[4rem]">
        Select your sex
      </h1>
      <div className="flex gap-4">
        <button
          onClick={() => onNext('Male')}
          className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover"
        >
          Male
        </button>
        <button
          onClick={() => onNext('Female')}
          className="rounded-full bg-gradient-light px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-primary hover:-translate-y-1 shadow-button hover:shadow-button-hover"
        >
          Female
        </button>
      </div>
    </div>
  );
} 