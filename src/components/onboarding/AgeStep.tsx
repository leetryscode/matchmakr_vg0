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
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-[4rem] text-primary-blue">
        What's your birth year?
      </h1>
      <input
        type="number"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        placeholder="YYYY"
        maxLength={4}
        className="w-full max-w-md rounded-md border border-gray-300 bg-background-card px-4 py-3 text-center text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
      />
      <button
        onClick={handleNext}
        disabled={!/^\d{4}$/.test(birthYear)}
        className="rounded-full bg-primary-blue px-10 py-3 font-semibold text-white no-underline transition hover:bg-primary-blue-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
} 