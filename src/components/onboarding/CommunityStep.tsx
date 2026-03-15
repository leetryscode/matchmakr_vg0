'use client';

import React, { useMemo, useState } from 'react';

export type CommunityIntent = { communityId: string } | null;

interface CommunityStepProps {
  onNext: (intent: CommunityIntent) => void;
  variant?: 'single' | 'sponsor';
  /** Invited community (from invite flow). */
  prefillCommunityId?: string | null;
  prefillCommunityName?: string | null;
}

export default function CommunityStep({ onNext, variant, prefillCommunityId, prefillCommunityName }: CommunityStepProps) {
  const [joinSelected, setJoinSelected] = useState(true);
  void variant;

  const displayCommunityName = useMemo(() => {
    const trimmed = prefillCommunityName?.trim();
    if (trimmed) return trimmed;
    return 'this community';
  }, [prefillCommunityName]);

  const handleNext = () => {
    if (joinSelected && prefillCommunityId) {
      onNext({ communityId: prefillCommunityId });
      return;
    }
    onNext(null);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        You've been invited to join
      </h1>
      <p className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        {displayCommunityName}
      </p>
      <label className="flex items-center gap-3 text-lg font-light text-orbit-text">
        <input
          type="checkbox"
          checked={joinSelected}
          onChange={(e) => setJoinSelected(e.target.checked)}
          className="h-5 w-5 rounded border-orbit-border/70 bg-orbit-surface/80 text-orbit-gold focus:ring-orbit-gold"
        />
        Join this community
      </label>
      <div>
        <button onClick={handleNext} className="orbit-btn-primary min-h-[48px] px-10 py-3">
          Next
        </button>
      </div>
    </div>
  );
}
