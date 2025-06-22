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
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-900 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-bold text-white">What's your name?</h2>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-pink-400 focus:outline-none focus:ring-pink-400"
          placeholder="Enter your name"
        />
      </div>
      <button
        onClick={handleNext}
        disabled={!name.trim()}
        className="rounded-full bg-pink-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default NameStep; 