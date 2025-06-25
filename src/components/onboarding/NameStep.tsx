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
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-md p-8 space-y-6 bg-background-card rounded-lg shadow-lg text-center border border-gray-200">
        <h2 className="text-3xl font-bold text-primary-blue">What's your name?</h2>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 bg-background-card px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
          placeholder="Enter your name"
        />
      </div>
      <button
        onClick={handleNext}
        disabled={!name.trim()}
        className="rounded-full bg-primary-blue px-10 py-3 font-semibold text-white no-underline transition hover:bg-primary-blue-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default NameStep; 