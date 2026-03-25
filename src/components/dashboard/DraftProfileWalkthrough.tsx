/**
 * DraftProfileWalkthrough
 *
 * 4-step full-screen portal modal that opens after a sponsor sends a new invite (Path A).
 * Lets the sponsor fill in draft profile fields immediately after inviting their single.
 * Each step saves independently to invites.draft_* columns via the Supabase client.
 *
 * Step 1: Endorsement (free-text)
 * Step 2: Pairings (PairingsPillSelector)
 * Step 3: Introduction signal (IntroductionSignalInput)
 * Step 4: Photo (DraftPhotoUpload)
 */

'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { buildPairingsSignal } from '@/lib/pairings';
import type { PairingsSelectionState } from '@/components/profile/PairingsPillSelector';
import type { IntroductionSignal } from '@/types/introductionSignal';
import PairingsPillSelector from '@/components/profile/PairingsPillSelector';
import IntroductionSignalInput from '@/components/profile/IntroductionSignalInput';
import DraftPhotoUpload from '@/components/dashboard/DraftPhotoUpload';

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const ENDORSEMENT_MAX_CHARS = 500;

// ── Types ────────────────────────────────────────────────────────────────────

interface DraftProfileWalkthroughProps {
  inviteId: string;
  inviteeName: string | null;
  /** Auth user ID — needed as storage path prefix for photo uploads. */
  userId: string;
  onClose: () => void;
}

// ── Step labels (used for screen-reader context) ─────────────────────────────

const STEP_LABELS = ['Endorsement', 'Pairings', 'Introduction', 'Photo'];

// ── Component ────────────────────────────────────────────────────────────────

export default function DraftProfileWalkthrough({
  inviteId,
  inviteeName,
  userId,
  onClose,
}: DraftProfileWalkthroughProps) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [endorsement, setEndorsement] = useState('');

  // Step 2 state
  const [pairingsState, setPairingsState] = useState<PairingsSelectionState>({
    qualityIds: [],
    customQuality: '',
  });

  // Step 3 state
  const [introSignal, setIntroSignal] = useState<IntroductionSignal | null>(null);

  // Step 4 state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const displayName = inviteeName ?? 'your single';

  // ── Save helpers ───────────────────────────────────────────────────────────

  const saveStep1 = async (): Promise<boolean> => {
    const trimmed = endorsement.trim();
    if (!trimmed) return true; // skip — field is optional
    const { error: err } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: inviteId,
      p_draft_endorsement: trimmed,
    });
    if (err) { setError(err.message); return false; }
    return true;
  };

  const saveStep2 = async (): Promise<boolean> => {
    const hasSelections =
      pairingsState.qualityIds.length > 0 || pairingsState.customQuality.trim();
    if (!hasSelections) return true; // skip — field is optional
    const result = buildPairingsSignal({
      qualityIds: pairingsState.qualityIds,
      customQuality: pairingsState.customQuality.trim() || null,
    });
    if (!result.ok) { setError(result.error); return false; }
    const { error: err } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: inviteId,
      p_draft_pairings: result.signal,
    });
    if (err) { setError(err.message); return false; }
    return true;
  };

  const saveStep3 = async (): Promise<boolean> => {
    if (!introSignal) return true; // skip — field is optional
    const { error: err } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: inviteId,
      p_draft_introduction: introSignal,
    });
    if (err) { setError(err.message); return false; }
    return true;
  };

  const saveStep4 = async (): Promise<boolean> => {
    if (!photoUrl) return true; // skip — field is optional
    const { error: err } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: inviteId,
      p_draft_photos: [photoUrl],
    });
    if (err) { setError(err.message); return false; }
    return true;
  };

  const saveFns = [saveStep1, saveStep2, saveStep3, saveStep4];

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleSaveAndContinue = async () => {
    setError(null);
    setSaving(true);
    const ok = await saveFns[step - 1]();
    setSaving(false);
    if (!ok) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    setError(null);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  // ── Step content ───────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <p className="text-orbit-muted text-sm mb-4">
              How do you know {displayName}? What would you tell a friend about them?
              A quick story or detail goes a long way — other sponsors will read this first.
            </p>
            <textarea
              value={endorsement}
              onChange={(e) => setEndorsement(e.target.value)}
              placeholder="Write your endorsement…"
              rows={5}
              disabled={saving}
              maxLength={ENDORSEMENT_MAX_CHARS}
              className="w-full px-4 py-3 border border-orbit-border rounded-lg bg-orbit-surface1 text-orbit-text placeholder:text-orbit-muted focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:border-orbit-gold/50 resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end mt-1">
              <p className="text-xs text-orbit-muted">
                {endorsement.length}/{ENDORSEMENT_MAX_CHARS}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <p className="text-orbit-muted text-sm mb-4">
              You know {displayName} — pick the traits that fit. Other sponsors will use this to spot a great pairing.
            </p>
            <div className="max-h-[340px] overflow-y-auto">
              <PairingsPillSelector
                onChange={setPairingsState}
                disabled={saving}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <p className="text-orbit-muted text-sm mb-4">
              Pick a prompt and fill in the blank — quick, fun, and totally optional.
            </p>
            <IntroductionSignalInput
              profileName={inviteeName}
              onChange={setIntroSignal}
              disabled={saving}
            />
          </div>
        );

      case 4:
        return (
          <div>
            <p className="text-orbit-muted text-sm mb-6 text-center">
              Add a photo for {displayName}. You can change it later.
            </p>
            <DraftPhotoUpload
              userId={userId}
              currentPhotoUrl={photoUrl}
              onUploaded={setPhotoUrl}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS;

  // ── Render ─────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 bg-orbit-canvas flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg mx-auto flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-orbit-text">
              {step === 1 && 'In your own words…'}
              {step === 2 && `Describe ${displayName}'s energy`}
              {step === 3 && `A little more about ${displayName}`}
              {step === 4 && 'Add a photo'}
            </h2>
            <p className="text-xs text-orbit-muted mt-0.5">
              Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-orbit-border bg-orbit-surface-2 hover:bg-orbit-surface-1 transition text-orbit-muted hover:text-orbit-text"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-orbit-gold' : 'bg-orbit-border'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderStep()}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-orbit-warning mt-3">{error}</p>
        )}

        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-orbit-border">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-orbit-border bg-transparent text-orbit-muted hover:text-orbit-text hover:border-orbit-muted transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
          <button
            onClick={handleSaveAndContinue}
            disabled={saving}
            className="flex-1 h-11 rounded-cta bg-orbit-gold text-orbit-canvas font-semibold hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:ring-offset-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? 'Saving…' : isLastStep ? 'Done' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
