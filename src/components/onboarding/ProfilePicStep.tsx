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
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-[4rem]">
        Upload a profile picture
      </h1>
      <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gray-700">
        <p className="text-gray-400">Placeholder</p>
      </div>
      <button
        onClick={handleNext}
        className="rounded-full bg-pink-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-pink-600"
      >
        Next (Skip for now)
      </button>
    </div>
  );
} 