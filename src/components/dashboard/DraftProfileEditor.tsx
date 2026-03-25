/**
 * DraftProfileEditor
 *
 * Sponsor-facing page for filling in draft profile fields for a single who
 * hasn't signed up yet. Reads from and writes to invites.draft_* columns via
 * the save_invite_draft_fields RPC (SECURITY DEFINER — ownership verified in DB).
 *
 * Used by /dashboard/invite/[inviteId] — reachable from INVITED invite row cards.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { PairingsSignal } from '@/types/pairings';
import type { IntroductionSignal } from '@/types/introductionSignal';
import { getPairingQualityById } from '@/lib/pairings';
import PairingsModal from '@/components/profile/PairingsModal';
import IntroductionSignalModal from '@/components/profile/IntroductionSignalModal';
import DraftPhotoUpload from '@/components/dashboard/DraftPhotoUpload';
import AnimatedGoldBorder from '@/components/ui/AnimatedGoldBorder';

// ── Types ────────────────────────────────────────────────────────────────────

interface DraftInvite {
  id: string;
  invitee_label: string | null;
  invitee_email: string;
  draft_endorsement: string | null;
  draft_pairings_signal: PairingsSignal | null;
  draft_introduction_signal: IntroductionSignal | null;
  draft_photos: string[] | null;
}

interface DraftProfileEditorProps {
  invite: DraftInvite;
  userId: string;
}

type SectionKey = 'endorsement' | 'pairings' | 'introduction' | 'photo';

const ENDORSEMENT_MAX_CHARS = 500;

// ── SectionCard ───────────────────────────────────────────────────────────────
//
// Defined at module level (not inside DraftProfileEditor) so React never sees a
// new component type on re-render, preventing unmount/remount of card content.
//
// When highlighted: wraps with a 1.5px spinning conic-gradient "border".
//   - Outer div:  overflow:hidden clips gradient to card shape
//   - Gradient div: 200% × 200%, rotates via CSS animation
//   - Inner orbit-card: transparent border so gradient shows through
// When not highlighted: plain orbit-card, no wrapper overhead.
// When allFilled: all cards at full opacity (no de-emphasis).
// Otherwise: non-highlighted cards are dimmed to ~0.45 opacity.

interface SectionCardProps {
  isHighlighted: boolean;
  allFilled: boolean;
  children: React.ReactNode;
}

function SectionCard({ isHighlighted, allFilled, children }: SectionCardProps) {
  const dimmed = !allFilled && !isHighlighted;

  if (!isHighlighted) {
    return (
      <div
        className="orbit-card p-5"
        style={dimmed ? { opacity: 0.45 } : undefined}
      >
        {children}
      </div>
    );
  }
  return (
    <AnimatedGoldBorder>
      {/*
        Inner card. border-color: transparent removes the orbit-surface border so
        the conic-gradient in the wrapper padding area shows unobstructed.
        The card background (orbit-surface-2) still covers the interior.
      */}
      <div className="orbit-card p-5 relative" style={{ borderColor: 'transparent' }}>
        {children}
      </div>
    </AnimatedGoldBorder>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DraftProfileEditor({ invite, userId }: DraftProfileEditorProps) {
  const supabase = createClient();
  const displayName = invite.invitee_label || invite.invitee_email;
  const initial = displayName.charAt(0).toUpperCase();

  // ── Local state (optimistic) ───────────────────────────────────────────────

  const [endorsement, setEndorsement] = useState(invite.draft_endorsement ?? '');
  const [pairingsSignal, setPairingsSignal] = useState<PairingsSignal | null>(
    invite.draft_pairings_signal
  );
  const [introSignal, setIntroSignal] = useState<IntroductionSignal | null>(
    invite.draft_introduction_signal
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(invite.draft_photos?.[0] ?? null);

  // ── Endorsement edit state ─────────────────────────────────────────────────

  const [isEditingEndorsement, setIsEditingEndorsement] = useState(false);
  const [endorsementDraft, setEndorsementDraft] = useState(endorsement);
  const [savingEndorsement, setSavingEndorsement] = useState(false);
  const [endorsementError, setEndorsementError] = useState<string | null>(null);

  // ── Modal state ────────────────────────────────────────────────────────────

  const [isPairingsModalOpen, setIsPairingsModalOpen] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);

  // ── Photo error ────────────────────────────────────────────────────────────

  const [photoError, setPhotoError] = useState<string | null>(null);

  // ── Save helpers ───────────────────────────────────────────────────────────

  const saveEndorsement = async () => {
    const trimmed = endorsementDraft.trim();
    setSavingEndorsement(true);
    setEndorsementError(null);
    const { error } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: invite.id,
      p_draft_endorsement: trimmed || null,
    });
    setSavingEndorsement(false);
    if (error) { setEndorsementError(error.message); return; }
    setEndorsement(trimmed);
    setIsEditingEndorsement(false);
  };

  const savePairings = async (signal: PairingsSignal) => {
    const { error } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: invite.id,
      p_draft_pairings: signal,
    });
    if (error) throw error;
    setPairingsSignal(signal);
    setIsPairingsModalOpen(false);
  };

  const saveIntro = async (signal: IntroductionSignal) => {
    const { error } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: invite.id,
      p_draft_introduction: signal,
    });
    if (error) throw error;
    setIntroSignal(signal);
    setIsIntroModalOpen(false);
  };

  const savePhoto = async (url: string) => {
    setPhotoError(null);
    const { error } = await supabase.rpc('save_invite_draft_fields', {
      p_invite_id: invite.id,
      p_draft_photos: [url],
    });
    if (error) { setPhotoError(error.message); return; }
    setPhotoUrl(url);
  };

  const openEndorsementEdit = () => {
    setEndorsementDraft(endorsement);
    setEndorsementError(null);
    setIsEditingEndorsement(true);
  };

  // ── Derived display values ─────────────────────────────────────────────────

  const pairingLabels = pairingsSignal
    ? [
        ...pairingsSignal.quality_ids.map((id) => getPairingQualityById(id)?.label ?? id),
        ...(pairingsSignal.custom_quality ? [pairingsSignal.custom_quality] : []),
      ]
    : [];

  // ── Contextual highlighting ────────────────────────────────────────────────

  const firstEmptySection: SectionKey | null = (() => {
    if (!endorsement) return 'endorsement';
    if (!pairingsSignal) return 'pairings';
    if (!introSignal) return 'introduction';
    if (!photoUrl) return 'photo';
    return null;
  })();

  const allFilled = firstEmptySection === null;

  const PROMPTS: Record<SectionKey, string> = {
    endorsement: `Start here — tell other sponsors about ${displayName}`,
    pairings: `You know ${displayName} — pick the traits that fit.`,
    introduction: `Pick a prompt and fill in the blank — quick and fun.`,
    photo: `A photo helps other sponsors picture ${displayName}`,
  };

  // Highlighted Add button — gold filled pill
  const HighlightedAddButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-3 py-1 text-xs font-semibold rounded-full bg-orbit-gold text-orbit-canvas hover:opacity-90 active:opacity-80 transition-opacity"
    >
      Add
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-16">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/dashboard/matchmakr"
          className="text-[13px] text-orbit-muted hover:text-orbit-text transition-colors inline-flex items-center gap-1"
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* Profile header — centered */}
      <div className="flex flex-col items-center mb-8">
        {/* Photo circle */}
        <div
          className="rounded-full border-2 border-dashed border-orbit-gold flex items-center justify-center overflow-hidden shrink-0 mb-2"
          style={{ width: 100, height: 100 }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span className="text-orbit-gold font-medium" style={{ fontSize: 36, lineHeight: 1 }}>
              {initial}
            </span>
          )}
        </div>
        <span className="text-[11px] text-orbit-gold cursor-default">
          Add photo
        </span>

        {/* Name */}
        <h1 className="text-2xl font-medium text-orbit-text text-center mt-4 mb-1">
          {displayName}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-orbit-muted text-center mb-3">
          Building {displayName}&apos;s profile
        </p>

        {/* Invite pending pill */}
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium text-orbit-gold bg-orbit-gold/15">
          Invite pending
        </span>
      </div>

      {/* All-filled success message */}
      {allFilled && (
        <p className="text-sm text-orbit-muted mb-5 text-center">
          Looking good! When {displayName} joins Orbit and accepts your sponsorship, everything here becomes their live profile.
        </p>
      )}

      {/* Section cards */}
      <div className="flex flex-col gap-4">

        {/* ── Endorsement ─────────────────────────────────────────────────── */}
        <SectionCard isHighlighted={firstEmptySection === 'endorsement'} allFilled={allFilled}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-orbit-text">Endorsement</h2>
            {!isEditingEndorsement && (
              firstEmptySection === 'endorsement' ? (
                <HighlightedAddButton onClick={openEndorsementEdit} />
              ) : (
                <button
                  onClick={openEndorsementEdit}
                  className="text-sm text-orbit-gold hover:opacity-80 transition-opacity"
                >
                  {endorsement ? 'Edit' : 'Add'}
                </button>
              )
            )}
          </div>

          {isEditingEndorsement ? (
            <div>
              <textarea
                value={endorsementDraft}
                onChange={(e) => setEndorsementDraft(e.target.value)}
                rows={5}
                maxLength={ENDORSEMENT_MAX_CHARS}
                disabled={savingEndorsement}
                placeholder="Share what makes them a great person to date…"
                className="w-full px-4 py-3 border border-orbit-border rounded-lg bg-orbit-surface1 text-orbit-text placeholder:text-orbit-muted focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:border-orbit-gold/50 resize-none text-sm disabled:opacity-50"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <div className="flex justify-between items-center mt-1 mb-3">
                <span className="text-xs text-orbit-muted">
                  {endorsementDraft.length}/{ENDORSEMENT_MAX_CHARS}
                </span>
              </div>
              {endorsementError && (
                <p className="text-sm text-orbit-warning mb-3">{endorsementError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingEndorsement(false)}
                  disabled={savingEndorsement}
                  className="flex-1 h-9 rounded-lg border border-orbit-border bg-transparent text-orbit-muted text-sm hover:text-orbit-text hover:border-orbit-muted transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEndorsement}
                  disabled={savingEndorsement}
                  className="flex-1 h-9 rounded-cta bg-orbit-gold text-orbit-canvas text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {savingEndorsement ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : endorsement ? (
            <p className="text-sm text-orbit-text leading-relaxed whitespace-pre-wrap">
              {endorsement}
            </p>
          ) : firstEmptySection === 'endorsement' ? (
            <div>
              <p className="text-sm text-orbit-muted mb-3">{PROMPTS.endorsement}</p>
              <div
                className="rounded-lg border border-orbit-border bg-orbit-surface-2 cursor-text"
                style={{ minHeight: 80, padding: '12px 16px' }}
                onClick={openEndorsementEdit}
              >
                <span className="text-sm text-orbit-muted" style={{ opacity: 0.45 }}>
                  Write your endorsement...
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-orbit-muted italic">No endorsement yet.</p>
          )}
        </SectionCard>

        {/* ── Pairings ────────────────────────────────────────────────────── */}
        <SectionCard isHighlighted={firstEmptySection === 'pairings'} allFilled={allFilled}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-orbit-text">Pairings</h2>
            {firstEmptySection === 'pairings' ? (
              <HighlightedAddButton onClick={() => setIsPairingsModalOpen(true)} />
            ) : (
              <button
                onClick={() => setIsPairingsModalOpen(true)}
                className="text-sm text-orbit-gold hover:opacity-80 transition-opacity"
              >
                {pairingsSignal ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {pairingLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pairingLabels.map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-[13px] leading-snug border bg-orbit-surface-2 border-orbit-border text-orbit-text"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : firstEmptySection === 'pairings' ? (
            <p className="text-sm text-orbit-muted">{PROMPTS.pairings}</p>
          ) : (
            <p className="text-sm text-orbit-muted italic">No pairings yet.</p>
          )}
        </SectionCard>

        {/* ── Introduction ────────────────────────────────────────────────── */}
        <SectionCard isHighlighted={firstEmptySection === 'introduction'} allFilled={allFilled}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-orbit-text">Introduction</h2>
            {firstEmptySection === 'introduction' ? (
              <HighlightedAddButton onClick={() => setIsIntroModalOpen(true)} />
            ) : (
              <button
                onClick={() => setIsIntroModalOpen(true)}
                className="text-sm text-orbit-gold hover:opacity-80 transition-opacity"
              >
                {introSignal ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {introSignal ? (
            <div>
              <p className="text-xs text-orbit-muted mb-1.5 leading-relaxed">
                {introSignal.prompt_text}
              </p>
              <p className="text-sm text-orbit-text leading-relaxed">{introSignal.response}</p>
            </div>
          ) : firstEmptySection === 'introduction' ? (
            <p className="text-sm text-orbit-muted">{PROMPTS.introduction}</p>
          ) : (
            <p className="text-sm text-orbit-muted italic">No introduction yet.</p>
          )}
        </SectionCard>

        {/* ── Photo ───────────────────────────────────────────────────────── */}
        <SectionCard isHighlighted={firstEmptySection === 'photo'} allFilled={allFilled}>
          <h2 className="text-base font-semibold text-orbit-text mb-3">Photo</h2>
          {firstEmptySection === 'photo' && !photoUrl && (
            <p className="text-sm text-orbit-muted mb-4">{PROMPTS.photo}</p>
          )}
          {photoError && (
            <p className="text-sm text-orbit-warning mb-3">{photoError}</p>
          )}
          <DraftPhotoUpload
            userId={userId}
            currentPhotoUrl={photoUrl}
            onUploaded={savePhoto}
          />
        </SectionCard>

      </div>

      {/* Explanation text */}
      <p
        className="text-center text-xs text-orbit-muted mt-4"
        style={{ lineHeight: 1.5 }}
      >
        Everything you add here will be part of {displayName}&apos;s profile once they accept
        your sponsorship.
      </p>

      {/* Modals */}
      <PairingsModal
        isOpen={isPairingsModalOpen}
        onClose={() => setIsPairingsModalOpen(false)}
        profileId={invite.id}
        initialSignal={pairingsSignal}
        canEdit={true}
        onSaved={savePairings}
      />
      <IntroductionSignalModal
        isOpen={isIntroModalOpen}
        initialSignal={introSignal}
        profileName={invite.invitee_label}
        onClose={() => setIsIntroModalOpen(false)}
        onSaved={saveIntro}
      />
    </div>
  );
}
