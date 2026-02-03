/**
 * Introduction Signal Section
 * 
 * Displays the sponsor-authored introduction signal on Single profile pages.
 * Shows empty state with default prompt or filled state with prompt + response.
 */

'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { IntroductionSignal } from '@/types/introductionSignal';
import {
  getDefaultIntroductionPrompt,
  renderIntroductionPrompt,
} from '@/lib/introductionSignal';
import IntroductionSignalModal from './IntroductionSignalModal';
import { clearPondCache } from '@/lib/pond-cache';

interface IntroductionSignalSectionProps {
  introductionSignal: any | null; // JSONB from database
  firstName: string;
  profileId: string;
  profileName: string | null;
  canEdit?: boolean; // isSponsorOfThisSingle
  viewerIsProfileOwner?: boolean; // isViewingOwnSingleProfile
  compact?: boolean; // tighter spacing for PondView
}

/**
 * Safely parse introduction signal from JSONB
 * Returns null if invalid or missing required fields
 */
function parseIntroductionSignal(
  data: any | null
): IntroductionSignal | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Validate required fields
  if (
    typeof data.prompt_id !== 'string' ||
    typeof data.prompt_text !== 'string' ||
    typeof data.response !== 'string'
  ) {
    return null;
  }

  return {
    prompt_id: data.prompt_id,
    prompt_text: data.prompt_text,
    response: data.response,
  };
}

export default function IntroductionSignalSection({
  introductionSignal,
  firstName,
  profileId,
  profileName,
  canEdit = false,
  viewerIsProfileOwner = false,
  compact = false,
}: IntroductionSignalSectionProps) {
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSignal, setLocalSignal] = useState<IntroductionSignal | null>(
    () => parseIntroductionSignal(introductionSignal)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const signal = localSignal;
  // Blank definition: missing/null OR invalid parse OR response is empty after trim
  const isEmpty = !signal || !signal.response || signal.response.trim() === '';
  const defaultPrompt = getDefaultIntroductionPrompt();
  const displayName = firstName || 'This person';
  
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

  const handleSaved = async (newSignal: IntroductionSignal): Promise<void> => {
    setSaveError(null);

    // Save to Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ introduction_signal: newSignal })
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
    const renderedPrompt = renderIntroductionPrompt(
      defaultPrompt.template,
      displayName
    );

    return (
      <>
        <div className="py-6 relative">
          {canEdit && (
            <button
              onClick={handleAdd}
              className="absolute top-0 right-0 px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-medium transition-colors"
              aria-label="Add introduction signal"
            >
              Add
            </button>
          )}
          <p className={`text-white/90 font-medium leading-relaxed text-center ${compact ? 'text-base' : 'text-lg'}`}>
            {renderedPrompt}
          </p>
          {saveError && (
            <p className="text-sm text-red-400 mt-2 text-center">{saveError}</p>
          )}
        </div>
        {canEdit && (
          <IntroductionSignalModal
            isOpen={isModalOpen}
            initialSignal={null}
            profileName={profileName}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        )}
      </>
    );
  }

  // Filled state - combine prompt_text and response
  const parts = signal.prompt_text.split('___');
  const beforeResponse = parts[0];
  const afterResponse = parts[1] || '';

  return (
    <>
      <div className={`relative ${compact ? 'py-4' : 'py-6'}`}>
        {canEdit && (
          <button
            onClick={handleEdit}
            className="absolute top-0 right-0 px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-medium transition-colors"
            aria-label="Edit introduction signal"
          >
            Edit
          </button>
        )}
        <p className={`text-white/90 font-medium leading-relaxed text-center ${compact ? 'text-base' : 'text-lg'}`}>
          {beforeResponse}
          <span className="text-white font-semibold">{signal.response}</span>
          {afterResponse}
        </p>
        {saveError && (
          <p className="text-sm text-red-400 mt-2 text-center">{saveError}</p>
        )}
      </div>
      {canEdit && (
        <IntroductionSignalModal
          isOpen={isModalOpen}
          initialSignal={signal}
          profileName={profileName}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

