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
      <h1 className="text-4xl font-light text-orbit-text leading-[1.1] tracking-tight sm:text-[4rem]">
        Orbit Community
      </h1>
      {subtext && (
        <p className="text-orbit-muted font-light text-center max-w-md">
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
              className={`orbit-ring flex flex-col gap-3 rounded-card-lg p-6 text-orbit-text card-hover-subtle transition-all duration-200 hover:-translate-y-0.5 font-light text-center text-lg ${
                isRecommended
                  ? 'orbit-surface-strong border-orbit-gold/60'
                  : 'orbit-surface-soft'
              }`}
            >
              {card.label}
              {isRecommended && (
                <span className="text-sm text-orbit-gold font-light">(recommended)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
