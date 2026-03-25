/**
 * Pairings Modal
 *
 * Modal for adding/editing sponsor-authored pairing qualities.
 * UI delegated to PairingsPillSelector; this component handles save/cancel logic only.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { PairingsSignal } from '@/types/pairings';
import { buildPairingsSignal } from '@/lib/pairings';
import { MAX_PAIRING_QUALITIES } from '@/config/pairingQualities';
import PairingsPillSelector, { type PairingsSelectionState } from './PairingsPillSelector';

interface PairingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  initialSignal: PairingsSignal | null;
  canEdit: boolean;
  onSaved: (signal: PairingsSignal) => void;
}

export default function PairingsModal({
  isOpen,
  onClose,
  profileId: _profileId,
  initialSignal,
  canEdit,
  onSaved,
}: PairingsModalProps) {
  const [pairingsState, setPairingsState] = useState<PairingsSelectionState>({
    qualityIds: initialSignal?.quality_ids ?? [],
    customQuality: initialSignal?.custom_quality ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync state when modal opens with new signal
  useEffect(() => {
    if (isOpen) {
      setPairingsState({
        qualityIds: initialSignal?.quality_ids ?? [],
        customQuality: initialSignal?.custom_quality ?? '',
      });
      setError(null);
    }
  }, [isOpen, initialSignal]);

  if (!isOpen || !canEdit) return null;

  const totalSelected =
    pairingsState.qualityIds.length + (pairingsState.customQuality.trim() ? 1 : 0);
  const isValid = totalSelected > 0 && totalSelected <= MAX_PAIRING_QUALITIES;
  const canSave = isValid && !saving;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const result = buildPairingsSignal({
        qualityIds: pairingsState.qualityIds,
        customQuality: pairingsState.customQuality.trim() || null,
      });
      if (!result.ok) {
        setError(result.error || 'Validation failed');
        setSaving(false);
        return;
      }
      await onSaved(result.signal);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`.pairings-modal-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div className="fixed inset-0 bg-orbit-canvas/80 flex justify-center items-center z-50 p-4">
        <div className="orbit-card rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[85vh] flex flex-col">
          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto mb-6 min-h-0 pairings-modal-scroll"
            style={
              {
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              } as React.CSSProperties & { scrollbarWidth?: string; msOverflowStyle?: string }
            }
          >
            <PairingsPillSelector
              initialSignal={initialSignal}
              onChange={setPairingsState}
              disabled={saving}
            />
          </div>

          {/* Save error (separate from selection errors shown in PairingsPillSelector) */}
          {error && (
            <p className="text-sm text-orbit-warning mb-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-orbit-border pt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl border border-orbit-border bg-orbit-surface-2 text-orbit-text hover:bg-orbit-surface-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 h-11 min-h-[44px] rounded-cta bg-action-primary text-orbit-canvas font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
