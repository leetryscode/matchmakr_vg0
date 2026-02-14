'use client';

import React from 'react';

export const ORBIT_COMMUNITY_SLUGS = [
  'north-county-san-diego',
  'boulder-colorado',
  'bring-orbit-waitlist',
] as const;

export type OrbitCommunitySlug = (typeof ORBIT_COMMUNITY_SLUGS)[number];

interface CommunityStepProps {
  onNext: (slug: OrbitCommunitySlug) => void;
}

const CARDS: { slug: OrbitCommunitySlug; label: string }[] = [
  { slug: 'north-county-san-diego', label: 'North County San Diego' },
  { slug: 'boulder-colorado', label: 'Boulder, Colorado' },
  { slug: 'bring-orbit-waitlist', label: 'Bring Orbit to my community' },
];

export default function CommunityStep({ onNext }: CommunityStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight sm:text-[4rem]">
        Orbit Community
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {CARDS.map((card) => (
          <button
            key={card.slug}
            onClick={() => onNext(card.slug)}
            className="flex flex-col gap-3 rounded-xl border border-border-light bg-background-card p-6 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 focus:ring-offset-background-main font-light text-center text-lg"
          >
            {card.label}
          </button>
        ))}
      </div>
    </div>
  );
}
