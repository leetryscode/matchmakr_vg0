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
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          What's your birthday?
        </h1>
        <p className="onboarding-muted">MM / DD / YYYY</p>
        <div className="flex flex-wrap justify-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="MM"
            maxLength={2}
            className="onboarding-input w-20 text-center"
          />
          <input
            type="text"
            inputMode="numeric"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="DD"
            maxLength={2}
            className="onboarding-input w-20 text-center"
          />
          <input
            type="text"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="YYYY"
            maxLength={4}
            className="onboarding-input w-24 text-center"
          />
        </div>
        {invalidDateError && (
          <p className="onboarding-muted text-sm">Please enter a valid date (e.g. no Feb 30).</p>
        )}
      </div>
      <div className="onboarding-step-actions">
        <button
          onClick={handleNext}
          disabled={!valid}
          className="onboarding-btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
