'use client';

import React, { useState } from 'react';

interface NameStepProps {
  onNext: (name: string) => void;
  /** Prefill from invite (editable) */
  initialValue?: string;
}

const NameStep: React.FC<NameStepProps> = ({ onNext, initialValue = '' }) => {
  const [name, setName] = useState(initialValue);

  const handleNext = () => {
    if (name.trim()) {
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      onNext(formattedName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <div className="orbit-surface-strong w-full max-w-md p-8 space-y-6 rounded-card-lg shadow-card text-center">
        <h2 className="text-3xl font-light text-orbit-text leading-[1.1]">What's your name?</h2>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="orbit-ring w-full rounded-xl border border-orbit-border/50 bg-orbit-surface/80 px-4 py-3 text-orbit-text placeholder:text-orbit-muted font-light"
          placeholder="Enter your name"
        />
      </div>
      
      <button
        onClick={handleNext}
        disabled={!name.trim()}
        className="orbit-btn-primary min-h-[48px] px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

export default NameStep; 