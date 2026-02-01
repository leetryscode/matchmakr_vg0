'use client';

import React, { useState } from 'react';

interface NameStepProps {
  onNext: (name: string) => void;
}

const NameStep: React.FC<NameStepProps> = ({ onNext }) => {
  const [name, setName] = useState('');

  const handleNext = () => {
    if (name.trim()) {
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      onNext(formattedName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-background-card rounded-xl shadow-card text-center border border-gray-200">
        <h2 className="text-3xl font-light bg-gradient-primary bg-clip-text text-transparent leading-[1.1]">What's your name?</h2>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-xl border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 font-light"
          placeholder="Enter your name"
        />
      </div>
      
      <button
        onClick={handleNext}
        disabled={!name.trim()}
        className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
      >
        Next
      </button>
    </div>
  );
};

export default NameStep; 