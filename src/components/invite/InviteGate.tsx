'use client';

import React from 'react';

export type InviteGateRole = 'SPONSOR' | 'SINGLE';

interface InviteGateProps {
  role: InviteGateRole;
  invitorName: string;
  onContinue: () => void;
  onChooseDifferentRole: () => void;
}

const SPONSOR_COPY = {
  headline: 'You were invited to Orbit as a Sponsor.',
  body: (name: string) =>
    `${name} invited you because they trust your judgment. Orbit replaces algorithms with real-world introductions.`,
};

const SINGLE_COPY = {
  headline: 'You were invited to Orbit as a Single.',
  body: (name: string) =>
    `${name} invited you because they believe in thoughtful introductions. Orbit replaces algorithms with real-world introductions.`,
};

export default function InviteGate({
  role,
  invitorName,
  onContinue,
  onChooseDifferentRole,
}: InviteGateProps) {
  const copy = role === 'SPONSOR' ? SPONSOR_COPY : SINGLE_COPY;

  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
          {copy.headline}
        </h1>
        <p className="text-xl text-orbit-muted font-light">
          {copy.body(invitorName)}
        </p>
        <div className="flex flex-col items-center gap-3 pt-1">
          <p className="text-sm text-orbit-text font-normal opacity-75">
            This invitation was sent specifically to you.
          </p>
          <button
            onClick={onContinue}
            className="rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-bold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 px-10 py-3 no-underline w-full"
          >
            Continue
          </button>
        </div>
      </div>
      <div className="w-full max-w-md">
        <button
          onClick={onChooseDifferentRole}
          className="text-orbit-muted font-light text-sm underline hover:text-orbit-text transition-colors"
        >
          Not what you expected? Choose a different role.
        </button>
      </div>
    </div>
  );
}
