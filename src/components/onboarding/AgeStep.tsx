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
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-[4rem]">
        What's your birth year?
      </h1>
      <input
        type="number"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        placeholder="YYYY"
        maxLength={4}
        className="w-full max-w-md rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-center text-white placeholder-gray-500 focus:border-pink-400 focus:outline-none focus:ring-pink-400"
      />
      <button
        onClick={handleNext}
        disabled={!/^\d{4}$/.test(birthYear)}
        className="rounded-full bg-pink-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
} 