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
    <div className="onboarding-step-shell">
      <div className="onboarding-step-content">
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          You've been invited to join
        </h1>
        <p className="onboarding-accent-text text-3xl font-light leading-[1.1] tracking-tight sm:text-5xl">
          {displayCommunityName}
        </p>
        <label className="onboarding-muted flex items-center gap-3 text-base sm:text-lg">
          <input
            type="checkbox"
            checked={joinSelected}
            onChange={(e) => setJoinSelected(e.target.checked)}
            className="onboarding-checkbox"
          />
          Join this community
        </label>
      </div>
      <div className="onboarding-step-actions">
        <button onClick={handleNext} className="onboarding-btn-primary">
          Next
        </button>
      </div>
    </div>
  );
}
