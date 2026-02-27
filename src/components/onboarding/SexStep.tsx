'use client';

import React from 'react';

interface SexStepProps {
  onNext: (sex: 'Male' | 'Female') => void;
}

export default function SexStep({ onNext }: SexStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Select your sex
      </h1>
      <div className="flex gap-4">
        <button
          onClick={() => onNext('Male')}
          className="orbit-btn-primary min-h-[48px] px-10 py-3"
        >
          Male
        </button>
        <button
          onClick={() => onNext('Female')}
          className="orbit-btn-secondary min-h-[48px] px-10 py-3"
        >
          Female
        </button>
      </div>
    </div>
  );
} 