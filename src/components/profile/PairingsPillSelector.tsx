/**
 * PairingsPillSelector
 *
 * Controlled pill grid + custom quality input for selecting pairing qualities.
 * Manages its own display state internally; reports changes via onChange.
 * Used by PairingsModal (profile edit) and DraftProfileWalkthrough (invite draft).
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { PairingsSignal, PairingQualityCategory } from '@/types/pairings';
import { getPairingQualitiesByCategory } from '@/lib/pairings';
import { MAX_PAIRING_QUALITIES, MAX_CUSTOM_QUALITY_CHARS } from '@/config/pairingQualities';

export interface PairingsSelectionState {
  qualityIds: string[];
  customQuality: string;
}

interface PairingsPillSelectorProps {
  initialSignal?: PairingsSignal | null;
  onChange: (state: PairingsSelectionState) => void;
  disabled?: boolean;
}

const CATEGORY_ORDER: PairingQualityCategory[] = [
  'temperament',
  'values',
  'lifestyle',
  'social',
  'communication',
];

export default function PairingsPillSelector({
  initialSignal,
  onChange,
  disabled = false,
}: PairingsPillSelectorProps) {
  const [selectedQualityIds, setSelectedQualityIds] = useState<string[]>(
    initialSignal?.quality_ids ?? []
  );
  const [customQuality, setCustomQuality] = useState(initialSignal?.custom_quality ?? '');
  const [showCustomInput, setShowCustomInput] = useState(!!initialSignal?.custom_quality);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedQualityIds(initialSignal?.quality_ids ?? []);
    setCustomQuality(initialSignal?.custom_quality ?? '');
    setShowCustomInput(!!initialSignal?.custom_quality);
    setError(null);
  }, [initialSignal]);

  const totalSelected = selectedQualityIds.length + (customQuality.trim() ? 1 : 0);
  const isMaxReached = totalSelected >= MAX_PAIRING_QUALITIES;

  const handleToggleQuality = (qualityId: string) => {
    if (disabled) return;
    setError(null);
    const isSelected = selectedQualityIds.includes(qualityId);
    if (isSelected) {
      const newIds = selectedQualityIds.filter((id) => id !== qualityId);
      setSelectedQualityIds(newIds);
      onChange({ qualityIds: newIds, customQuality });
    } else {
      const wouldExceedMax =
        selectedQualityIds.length + 1 + (customQuality.trim() ? 1 : 0) > MAX_PAIRING_QUALITIES;
      if (wouldExceedMax) {
        setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
        return;
      }
      const newIds = [...selectedQualityIds, qualityId];
      setSelectedQualityIds(newIds);
      onChange({ qualityIds: newIds, customQuality });
    }
  };

  const handleCustomQualityChange = (value: string) => {
    if (disabled) return;
    setError(null);
    const normalized = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    if (normalized.length > MAX_CUSTOM_QUALITY_CHARS) {
      setError(`Custom quality must be ${MAX_CUSTOM_QUALITY_CHARS} characters or less`);
      return;
    }
    if (
      selectedQualityIds.length + (normalized.trim() ? 1 : 0) > MAX_PAIRING_QUALITIES &&
      normalized.trim()
    ) {
      setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
      return;
    }
    setCustomQuality(normalized);
    onChange({ qualityIds: selectedQualityIds, customQuality: normalized });
  };

  const handleToggleCustomInput = () => {
    if (disabled) return;
    if (showCustomInput) {
      setCustomQuality('');
      setShowCustomInput(false);
      onChange({ qualityIds: selectedQualityIds, customQuality: '' });
    } else {
      if (isMaxReached) {
        setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
        return;
      }
      setShowCustomInput(true);
    }
    setError(null);
  };

  const qualitiesByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    qualities: getPairingQualitiesByCategory(category),
  })).filter((group) => group.qualities.length > 0);

  return (
    <>
      <style>{`.pairings-pill-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="pairings-pill-scroll overflow-y-auto"
        style={
          {
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties & { scrollbarWidth?: string; msOverflowStyle?: string }
        }
      >
        {/* Predefined qualities grouped by category */}
        <div className="space-y-2">
          {qualitiesByCategory.map((group, groupIndex) => (
            <div key={group.category}>
              <div className="flex flex-wrap justify-start gap-x-2 gap-y-1.5">
                {group.qualities.map((quality) => {
                  const isSelected = selectedQualityIds.includes(quality.id);
                  const isDisabled = !isSelected && isMaxReached;
                  return (
                    <button
                      key={quality.id}
                      onClick={() => handleToggleQuality(quality.id)}
                      disabled={isDisabled || disabled}
                      className={`
                        px-3 py-1 rounded-full text-[13px] leading-snug border transition-all
                        ${
                          isSelected
                            ? 'bg-orbit-surface-2 border-orbit-border text-orbit-text ring-2 ring-orbit-gold/30'
                            : isDisabled
                            ? 'bg-orbit-surface-1 text-orbit-muted border-orbit-border cursor-not-allowed'
                            : 'bg-orbit-surface-2 text-orbit-text border-orbit-border hover:border-orbit-gold/50 hover:bg-orbit-surface-1'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {quality.label}
                    </button>
                  );
                })}
              </div>
              {groupIndex < qualitiesByCategory.length - 1 && (
                <div className="border-t border-orbit-border/20 my-2" />
              )}
            </div>
          ))}
        </div>

        {/* Custom quality */}
        <div className="mt-2">
          {!showCustomInput ? (
            <>
              {customQuality.trim() ? (
                <button
                  onClick={() => {
                    setCustomQuality('');
                    setError(null);
                    onChange({ qualityIds: selectedQualityIds, customQuality: '' });
                  }}
                  disabled={disabled}
                  className="px-3 py-1 rounded-full text-[13px] leading-snug border transition-all bg-orbit-surface-2 border-orbit-border text-orbit-text hover:bg-orbit-surface-2/90 hover:border-orbit-text/30 disabled:opacity-50"
                >
                  {customQuality.trim()}
                </button>
              ) : (
                <button
                  onClick={handleToggleCustomInput}
                  disabled={isMaxReached || disabled}
                  className={`
                    px-3 py-1 rounded-full text-[13px] leading-snug border transition-all
                    ${
                      isMaxReached || disabled
                        ? 'bg-orbit-surface-1 text-orbit-muted border-orbit-border cursor-not-allowed'
                        : 'bg-orbit-surface-1/20 text-orbit-muted border-orbit-border/40 hover:border-orbit-border hover:bg-orbit-surface-1/40 hover:text-orbit-text2'
                    }
                  `}
                >
                  + Add your own…
                </button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={customQuality}
                onChange={(e) => handleCustomQualityChange(e.target.value)}
                onBlur={() => {
                  const trimmed = customQuality.trim();
                  if (trimmed !== customQuality) {
                    setCustomQuality(trimmed);
                    onChange({ qualityIds: selectedQualityIds, customQuality: trimmed });
                  }
                  if (!trimmed) setShowCustomInput(false);
                }}
                placeholder="Enter a custom quality..."
                maxLength={MAX_CUSTOM_QUALITY_CHARS}
                disabled={disabled}
                className="w-full px-4 py-2 border border-orbit-border rounded-lg bg-orbit-surface-2 text-orbit-text placeholder:text-orbit-muted focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:border-orbit-gold/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between items-center">
                {error && <p className="text-sm text-orbit-warning flex-1">{error}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleCustomInput}
                    disabled={disabled}
                    className="text-xs text-orbit-muted hover:text-orbit-text2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <p className="text-xs text-orbit-muted">
                    {customQuality.length}/{MAX_CUSTOM_QUALITY_CHARS}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Non-max, non-char-limit errors */}
        {error && !error.includes('Maximum') && !error.includes('characters') && (
          <p className="text-sm text-orbit-warning mt-4">{error}</p>
        )}
      </div>
    </>
  );
}
