/**
 * Introduction Signal Modal
 *
 * Modal for adding/editing sponsor-authored introduction signals.
 * UI delegated to IntroductionSignalInput; this component handles save/cancel logic only.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { IntroductionSignal } from '@/types/introductionSignal';
import IntroductionSignalInput from './IntroductionSignalInput';

interface IntroductionSignalModalProps {
  isOpen: boolean;
  initialSignal: IntroductionSignal | null;
  profileName: string | null;
  onClose: () => void;
  onSaved: (newSignal: IntroductionSignal) => void;
}

export default function IntroductionSignalModal({
  isOpen,
  initialSignal,
  profileName,
  onClose,
  onSaved,
}: IntroductionSignalModalProps) {
  const [currentSignal, setCurrentSignal] = useState<IntroductionSignal | null>(initialSignal);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentSignal(initialSignal);
      setError(null);
    }
  }, [isOpen, initialSignal]);

  if (!isOpen) return null;

  const canSave = currentSignal !== null && !saving;

  const handleSave = async () => {
    if (!currentSignal) return;
    setError(null);
    setSaving(true);
    try {
      await onSaved(currentSignal);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-orbit-canvas/80 flex justify-center items-center z-50 p-4">
      <div className="orbit-card rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <IntroductionSignalInput
          initialSignal={initialSignal}
          profileName={profileName}
          onChange={setCurrentSignal}
          disabled={saving}
        />

        {error && (
          <p className="text-sm text-orbit-warning mt-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
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
  );
}
