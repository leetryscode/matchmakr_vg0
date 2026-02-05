/**
 * Pairings Section
 * 
 * Displays the sponsor-authored pairing qualities on Single profile pages.
 * Shows selected qualities as pills, with optional custom quality.
 */

'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PairingsSignal } from '@/types/pairings';
import { getPairingQualityById } from '@/lib/pairings';
import PairingsModal from './PairingsModal';
import { clearPondCache } from '@/lib/pond-cache';

interface PairingsSectionProps {
  profileId: string;
  pairingsSignal: any | null; // JSONB from database
  canEdit?: boolean; // isSponsorOfThisSingle
  viewerIsProfileOwner?: boolean; // isViewingOwnSingleProfile
  compact?: boolean; // tighter spacing for PondView
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
  viewerIsProfileOwner = false,
  compact = false,
}: PairingsSectionProps) {
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSignal, setLocalSignal] = useState<PairingsSignal | null>(
    () => parsePairingsSignal(pairingsSignal)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const signal = localSignal;
  // Blank definition: missing/null OR (no quality_ids AND no non-empty custom_quality)
  const isEmpty = !signal || (
    signal.quality_ids.length === 0 && 
    (!signal.custom_quality || signal.custom_quality.trim() === '')
  );
  
  // Visibility rule: hide if blank AND !canEdit AND !viewerIsProfileOwner
  if (isEmpty && !canEdit && !viewerIsProfileOwner) {
    return null;
  }

  const handleAdd = () => {
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSaveError(null);
  };

  const handleSaved = async (newSignal: PairingsSignal): Promise<void> => {
    setSaveError(null);

    // Save to Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ pairings_signal: newSignal })
      .eq('id', profileId);

    if (error) {
      setSaveError(error.message);
      // Don't close modal on error
      throw new Error(error.message);
    }

    // Update local state immediately
    setLocalSignal(newSignal);

    clearPondCache();

    // Close modal on success
    setIsModalOpen(false);
  };

  // Empty state
  if (isEmpty) {
    return (
      <>
        <div className={`flex justify-between items-center ${compact ? 'mb-1.5' : 'mb-2'}`}>
          <h2 className="text-white/70 text-base font-semibold">Pairs naturally with…</h2>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-sm font-medium transition-colors"
              aria-label="Add pairings"
            >
              Add
            </button>
          )}
        </div>
        {saveError && (
          <p className="text-sm text-red-400 mt-2">{saveError}</p>
        )}
        {canEdit && (
          <PairingsModal
            isOpen={isModalOpen}
            onClose={handleClose}
            profileId={profileId}
            initialSignal={null}
            canEdit={canEdit}
            onSaved={handleSaved}
          />
        )}
      </>
    );
  }

  // Filled state
  const qualities = signal.quality_ids
    .map((id) => getPairingQualityById(id))
    .filter((q): q is NonNullable<typeof q> => q !== null);

  return (
    <>
      <div className={`flex justify-between items-center ${compact ? 'mb-2' : 'mb-3'}`}>
        <h2 className="text-white/90 text-base font-semibold">Pairs naturally with</h2>
        {canEdit && (
          <button
            onClick={handleEdit}
            className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-sm font-medium transition-colors"
            aria-label="Edit pairings"
          >
            Edit
          </button>
        )}
      </div>
      <div className={`flex flex-wrap items-center justify-center ${compact ? 'gap-x-2 gap-y-1.5' : 'gap-2'}`}>
        {qualities.map((quality) => (
          <span
            key={quality.id}
            className="bg-white/10 text-white px-4 py-1.5 rounded-full text-base font-medium border border-white/10"
          >
            {quality.label}
          </span>
        ))}
        {signal.custom_quality && (
          <span className="bg-white/8 text-white px-4 py-1.5 rounded-full text-base font-medium border border-white/20">
            {signal.custom_quality}
          </span>
        )}
      </div>
      {saveError && (
        <p className="text-sm text-red-400 mt-2">{saveError}</p>
      )}
      {canEdit && (
        <PairingsModal
          isOpen={isModalOpen}
          onClose={handleClose}
          profileId={profileId}
          initialSignal={signal}
          canEdit={canEdit}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

