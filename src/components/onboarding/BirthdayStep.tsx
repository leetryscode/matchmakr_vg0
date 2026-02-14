'use client';

import React, { useState } from 'react';

interface BirthdayStepProps {
  onNext: (birthDate: string) => void;
  onTooYoung: () => void;
}

/** Returns true if (year, month 1-12, day) is a real calendar date; rejects 2/30, 4/31, 13/1, etc. */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function is18OrOlder(year: number, month: number, day: number): boolean {
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

export default function BirthdayStep({ onNext, onTooYoung }: BirthdayStepProps) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [invalidDateError, setInvalidDateError] = useState(false);

  const handleNext = () => {
    setInvalidDateError(false);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) return;
    if (!isValidCalendarDate(y, m, d)) {
      setInvalidDateError(true);
      return;
    }

    if (!is18OrOlder(y, m, d)) {
      onTooYoung();
      return;
    }
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onNext(iso);
  };

  const valid =
    /^(0?[1-9]|1[0-2])$/.test(month) &&
    /^(0?[1-9]|[12]\d|3[01])$/.test(day) &&
    /^\d{4}$/.test(year);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight sm:text-[4rem]">
        What's your birthday?
      </h1>
      <p className="text-text-light font-light">MM / DD / YYYY</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <input
          type="text"
          inputMode="numeric"
          value={month}
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="MM"
          maxLength={2}
          className="w-20 rounded-xl border border-white/20 bg-background-card px-4 py-3 text-center text-text-dark placeholder:text-text-dark placeholder:opacity-80 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
        />
        <input
          type="text"
          inputMode="numeric"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="DD"
          maxLength={2}
          className="w-20 rounded-xl border border-white/20 bg-background-card px-4 py-3 text-center text-text-dark placeholder:text-text-dark placeholder:opacity-80 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
        />
        <input
          type="text"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="YYYY"
          maxLength={4}
          className="w-24 rounded-xl border border-white/20 bg-background-card px-4 py-3 text-center text-text-dark placeholder:text-text-dark placeholder:opacity-80 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
        />
      </div>
      {invalidDateError && (
        <p className="text-sm text-red-500 font-light">Please enter a valid date (e.g. no Feb 30).</p>
      )}
      <button
        onClick={handleNext}
        disabled={!valid}
        className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
      >
        Next
      </button>
    </div>
  );
}
