'use client';

import React from 'react';

interface ProfilePicStepProps {
  onNext: (picUrl: string) => void;
}

export default function ProfilePicStep({ onNext }: ProfilePicStepProps) {
  // TODO: Implement actual file upload to Supabase Storage
  const handleNext = () => {
    onNext('https://example.com/placeholder.jpg');
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Upload a profile picture
      </h1>
      <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gray-100 border-2 border-dashed border-gray-300 shadow-card">
        <p className="text-gray-500 font-light">Placeholder</p>
      </div>
      <button
        onClick={handleNext}
        className="rounded-full bg-gradient-primary px-10 py-3 font-light text-white no-underline transition-all duration-300 hover:bg-gradient-light hover:-translate-y-1 shadow-button hover:shadow-button-hover"
      >
        Next (Skip for now)
      </button>
    </div>
  );
} 