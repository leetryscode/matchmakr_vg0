/**
 * Pairings Section
 * 
 * Displays the sponsor-authored pairing qualities on Single profile pages.
 * Shows selected qualities as pills, with optional custom quality.
 */

'use client';

import React from 'react';
import type { PairingsSignal } from '@/types/pairings';
import { getPairingQualityById } from '@/lib/pairings';

interface PairingsSectionProps {
  profileId: string;
  pairingsSignal: any | null; // JSONB from database
  canEdit?: boolean;
}

/**
 * Safely parse pairings signal from JSONB
 * Returns null if invalid or missing required fields
 */
function parsePairingsSignal(data: any | null): PairingsSignal | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Validate required fields
  if (!Array.isArray(data.quality_ids)) {
    return null;
  }

  // Validate quality_ids are strings
  if (!data.quality_ids.every((id: any) => typeof id === 'string')) {
    return null;
  }

  return {
    quality_ids: data.quality_ids,
    custom_quality: data.custom_quality || null,
  };
}

export default function PairingsSection({
  profileId,
  pairingsSignal,
  canEdit = false,
}: PairingsSectionProps) {
  const signal = parsePairingsSignal(pairingsSignal);
  const isEmpty = !signal || (signal.quality_ids.length === 0 && !signal.custom_quality);

  // Empty state
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-white/70 text-sm font-semibold">Pairs well with…</h2>
          {canEdit && (
            <button
              onClick={() => {
                // Placeholder: will open modal in next step
                console.log('Add pairings');
              }}
              className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-xs font-semibold transition-colors"
              aria-label="Add pairings"
            >
              Add
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filled state
  const qualities = signal.quality_ids
    .map((id) => getPairingQualityById(id))
    .filter((q): q is NonNullable<typeof q> => q !== null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-white/90 font-semibold">Pairs well with</h2>
        {canEdit && (
          <button
            onClick={() => {
              // Placeholder: will open modal in next step
              console.log('Edit pairings');
            }}
            className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-xs font-semibold transition-colors"
            aria-label="Edit pairings"
          >
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-start">
        {qualities.map((quality) => (
          <span
            key={quality.id}
            className="bg-white/10 text-white px-3 py-1 rounded-full text-xs border border-white/10"
          >
            {quality.label}
          </span>
        ))}
        {signal.custom_quality && (
          <span className="bg-white/8 text-white px-3 py-1 rounded-full text-xs border border-white/20 relative">
            {signal.custom_quality}
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white/40 rounded-full" aria-hidden="true"></span>
          </span>
        )}
      </div>
    </div>
  );
}

