/**
 * Pairings Modal
 *
 * Modal for adding/editing sponsor-authored pairing qualities.
 * Allows selecting up to 5 predefined qualities and optionally a custom quality.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { PairingsSignal, PairingQualityCategory } from '@/types/pairings';
import {
  getPairingQualitiesByCategory,
  buildPairingsSignal,
} from '@/lib/pairings';
import { MAX_PAIRING_QUALITIES, MAX_CUSTOM_QUALITY_CHARS } from '@/config/pairingQualities';

interface PairingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  initialSignal: PairingsSignal | null;
  canEdit: boolean;
  onSaved: (signal: PairingsSignal) => void;
}

const CATEGORY_ORDER: PairingQualityCategory[] = [
  'temperament',
  'values',
  'lifestyle',
  'social',
  'communication',
];

export default function PairingsModal({
  isOpen,
  onClose,
  profileId,
  initialSignal,
  canEdit,
  onSaved,
}: PairingsModalProps) {
  const [selectedQualityIds, setSelectedQualityIds] = useState<string[]>([]);
  const [customQuality, setCustomQuality] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize state from initialSignal
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialSignal) {
      setSelectedQualityIds(initialSignal.quality_ids || []);
      setCustomQuality(initialSignal.custom_quality || '');
      setShowCustomInput(!!initialSignal.custom_quality);
    } else {
      setSelectedQualityIds([]);
      setCustomQuality('');
      setShowCustomInput(false);
    }
    setError(null);
  }, [isOpen, initialSignal]);

  if (!isOpen || !canEdit) {
    return null;
  }

  // Calculate total selected (including custom)
  const totalSelected = selectedQualityIds.length + (customQuality.trim() ? 1 : 0);
  const isMaxReached = totalSelected >= MAX_PAIRING_QUALITIES;

  // Toggle quality selection
  const handleToggleQuality = (qualityId: string) => {
    if (saving) return;

    setError(null);

    const isSelected = selectedQualityIds.includes(qualityId);

    if (isSelected) {
      // Deselect
      setSelectedQualityIds(selectedQualityIds.filter((id) => id !== qualityId));
    } else {
      // Check if adding this quality would exceed max
      const wouldExceedMax = (selectedQualityIds.length + 1 + (customQuality.trim() ? 1 : 0)) > MAX_PAIRING_QUALITIES;
      if (wouldExceedMax) {
        setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
        return;
      }
      // Select
      setSelectedQualityIds([...selectedQualityIds, qualityId]);
    }
  };

  // Handle custom quality input
  const handleCustomQualityChange = (value: string) => {
    if (saving) return;

    setError(null);

    // Normalize: remove line breaks and collapse whitespace
    const normalized = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

    // Check length
    if (normalized.length > MAX_CUSTOM_QUALITY_CHARS) {
      setError(`Custom quality must be ${MAX_CUSTOM_QUALITY_CHARS} characters or less`);
      return;
    }

    // Check if we can add custom (counting toward max)
    const wouldBeAtMax = (selectedQualityIds.length + (normalized.trim() ? 1 : 0)) > MAX_PAIRING_QUALITIES;
    if (wouldBeAtMax && normalized.trim()) {
      setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
      return;
    }

    setCustomQuality(normalized);
  };

  // Handle show/hide custom input
  const handleToggleCustomInput = () => {
    if (saving) return;

    if (showCustomInput) {
      // Hide and clear custom quality
      setCustomQuality('');
      setShowCustomInput(false);
    } else {
      // Check if we can add custom
      if (isMaxReached) {
        setError(`Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`);
        return;
      }
      setShowCustomInput(true);
    }
    setError(null);
  };

  // Handle save
  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      // Build and validate signal
      const normalizedCustom = customQuality.trim() || null;
      const result = buildPairingsSignal({
        qualityIds: selectedQualityIds,
        customQuality: normalizedCustom,
      });

      if (!result.ok) {
        setError(result.error || 'Validation failed');
        setSaving(false);
        return;
      }

      // Call onSaved callback (this will handle the actual save and close modal on success)
      await onSaved(result.signal);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  // Check if save is valid
  const isValid = totalSelected > 0 && totalSelected <= MAX_PAIRING_QUALITIES;
  const canSave = isValid && !saving && !error;

  // Group qualities by category
  const qualitiesByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    qualities: getPairingQualitiesByCategory(category),
  })).filter((group) => group.qualities.length > 0);

  return (
    <>
      <style>{`
        .pairings-modal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="fixed inset-0 bg-orbit-canvas/80 flex justify-center items-center z-50 p-4">
        <div className="orbit-card rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[85vh] flex flex-col">
          {/* Content area - scrollable */}
          <div
            className="flex-1 overflow-y-auto mb-6 min-h-0 pairings-modal-scroll"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            } as React.CSSProperties & { scrollbarWidth?: string; msOverflowStyle?: string }}
          >
          {/* Qualities grouped by category */}
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
                        disabled={isDisabled || saving}
                        className={`
                          px-3 py-1 rounded-full text-[13px] leading-snug border transition-all
                          ${isSelected
                            ? 'bg-orbit-surface-2 border-orbit-border text-orbit-text ring-2 ring-orbit-gold/30'
                            : isDisabled
                            ? 'bg-orbit-surface-1 text-orbit-muted border-orbit-border cursor-not-allowed'
                            : 'bg-orbit-surface-2 text-orbit-text border-orbit-border hover:border-orbit-gold/50 hover:bg-orbit-surface-1'
                          }
                          ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {quality.label}
                      </button>
                    );
                  })}
                </div>
                {/* Subtle divider between groups (except last) */}
                {groupIndex < qualitiesByCategory.length - 1 && (
                  <div className="border-t border-orbit-border/20 my-2"></div>
                )}
              </div>
            ))}
          </div>

          {/* Custom quality option */}
          <div className="mt-2">
            {!showCustomInput ? (
              <>
                {/* Show custom quality as a removable pill if it exists */}
                {customQuality.trim() ? (
                  <button
                    onClick={() => {
                      setCustomQuality('');
                      setError(null);
                    }}
                    disabled={saving}
                    className={`
                      px-3 py-1 rounded-full text-[13px] leading-snug border transition-all
                      bg-orbit-surface-2 border-orbit-border text-orbit-text hover:bg-orbit-surface-2/90 hover:border-orbit-text/30
                      ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {customQuality.trim()}
                  </button>
                ) : (
                  <button
                    onClick={handleToggleCustomInput}
                    disabled={isMaxReached || saving}
                    className={`
                      px-3 py-1 rounded-full text-[13px] leading-snug border transition-all
                      ${isMaxReached
                        ? 'bg-orbit-surface-1 text-orbit-muted border-orbit-border cursor-not-allowed'
                        : 'bg-orbit-surface-1/20 text-orbit-muted border-orbit-border/40 hover:border-orbit-border hover:bg-orbit-surface-1/40 hover:text-orbit-text2'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : ''}
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
                    // Trim on blur
                    const trimmed = customQuality.trim();
                    if (trimmed !== customQuality) {
                      setCustomQuality(trimmed);
                    }
                    // Auto-hide input if empty
                    if (!trimmed) {
                      setShowCustomInput(false);
                    }
                  }}
                  placeholder="Enter a custom quality..."
                  maxLength={MAX_CUSTOM_QUALITY_CHARS}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-orbit-border rounded-lg bg-orbit-surface-2 text-orbit-text placeholder:text-orbit-muted focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:border-orbit-gold/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between items-center">
                  {error && (
                    <p className="text-sm text-orbit-warning flex-1">{error}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleCustomInput}
                      disabled={saving}
                      className="text-xs text-orbit-muted hover:text-orbit-text2 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <p
                      className={`text-xs ${
                        customQuality.length > MAX_CUSTOM_QUALITY_CHARS * 0.9
                          ? 'text-orbit-muted'
                          : 'text-orbit-muted'
                      }`}
                    >
                      {customQuality.length}/{MAX_CUSTOM_QUALITY_CHARS}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error message (if not already shown above) */}
          {error && !error.includes('Maximum') && !error.includes('characters') && (
            <p className="text-sm text-orbit-warning mt-4">{error}</p>
          )}
        </div>

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
