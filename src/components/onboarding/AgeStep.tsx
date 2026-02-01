'use client';

import React, { useState } from 'react';

interface AgeStepProps {
  onNext: (birthYear: number) => void;
  onTooYoung: () => void;
}

export default function AgeStep({ onNext, onTooYoung }: AgeStepProps) {
  const [birthYear, setBirthYear] = useState('');

  const handleNext = () => {
    const year = parseInt(birthYear, 10);
    if (isNaN(year)) return;

    const currentYear = new Date().getFullYear();
    if (currentYear - year < 18) {
      onTooYoung();
    } else {
      onNext(year);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light bg-gradient-primary bg-clip-text text-transparent leading-[1.1] tracking-tight sm:text-[4rem]">
        What's your birth year?
      </h1>
      <input
        type="number"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        placeholder="YYYY"
        maxLength={4}
        className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-center text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
      />
      <button
        onClick={handleNext}
        disabled={!/^\d{4}$/.test(birthYear)}
        className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
      >
        Next
      </button>
    </div>
  );
} 