'use client';

import React from 'react';

interface SexStepProps {
  onNext: (sex: 'Male' | 'Female') => void;
}

export default function SexStep({ onNext }: SexStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-[4rem]">
        Select your sex
      </h1>
      <div className="flex gap-4">
        <button
          onClick={() => onNext('Male')}
          className="rounded-full bg-blue-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-blue-600"
        >
          Male
        </button>
        <button
          onClick={() => onNext('Female')}
          className="rounded-full bg-pink-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-pink-600"
        >
          Female
        </button>
      </div>
    </div>
  );
} 