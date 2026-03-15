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
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="onboarding-heading text-3xl leading-[1.1] sm:text-4xl">What's your name?</h2>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="onboarding-input"
          placeholder="Enter your name"
        />
      </div>
      </div>

      <div className="onboarding-step-actions">
        <button
          onClick={handleNext}
          disabled={!name.trim()}
          className="onboarding-btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NameStep; 