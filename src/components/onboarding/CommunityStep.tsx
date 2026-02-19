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
  /** UI intent for copy; keeps component agnostic of full user-type set. */
  variant?: 'single' | 'sponsor';
  /** Prefill from invite (editable); when set, show as recommended on matching card */
  defaultSlug?: string | null;
}

const CARDS: { slug: OrbitCommunitySlug; label: string }[] = [
  { slug: 'north-county-san-diego', label: 'North County San Diego' },
  { slug: 'boulder-colorado', label: 'Boulder, Colorado' },
  { slug: 'bring-orbit-waitlist', label: 'Bring Orbit to my community' },
];

const SUBTEXT: Record<'single' | 'sponsor', string> = {
  single: 'Orbit is growing deliberately, community by community.',
  sponsor: 'Where do you make introductions? Orbit is growing gradually, one community at a time.',
};

export default function CommunityStep({ onNext, variant, defaultSlug }: CommunityStepProps) {
  const subtext = variant ? SUBTEXT[variant] : '';
  const validDefault =
    defaultSlug && ORBIT_COMMUNITY_SLUGS.includes(defaultSlug as OrbitCommunitySlug)
      ? (defaultSlug as OrbitCommunitySlug)
      : undefined;
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-light text-text-dark leading-[1.1] tracking-tight sm:text-[4rem]">
        Orbit Community
      </h1>
      {subtext && (
        <p className="text-text-light font-light text-center max-w-md">
          {subtext}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {CARDS.map((card) => {
          const isRecommended = validDefault && validDefault === card.slug;
          return (
            <button
              key={card.slug}
              onClick={() => onNext(card.slug)}
              className={`flex flex-col gap-3 rounded-xl border p-6 text-text-dark card-hover-subtle shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 focus:ring-offset-background-main font-light text-center text-lg ${
                isRecommended
                  ? 'border-primary-blue bg-background-card/90'
                  : 'border-border-light bg-background-card'
              }`}
            >
              {card.label}
              {isRecommended && (
                <span className="text-sm text-primary-blue font-light">(recommended)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
