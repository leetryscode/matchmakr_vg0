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

interface IntroductionSignalSectionProps {
  introductionSignal: any | null; // JSONB from database
  firstName: string;
  profileId: string;
  profileName: string | null;
  canEdit?: boolean;
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
}: IntroductionSignalSectionProps) {
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSignal, setLocalSignal] = useState<IntroductionSignal | null>(
    () => parseIntroductionSignal(introductionSignal)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const signal = localSignal;
  const isEmpty = !signal;
  const defaultPrompt = getDefaultIntroductionPrompt();
  const displayName = firstName || 'This person';

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

    // Clear pond cache (match existing pattern)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pond_cache');
    }

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
        <div className="flex items-start gap-3">
          <p className="text-white/70 text-base font-normal leading-relaxed flex-1">
            {renderedPrompt}
          </p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-sm font-medium transition-colors shrink-0"
              aria-label="Add introduction signal"
            >
              Add
            </button>
          )}
        </div>
        {saveError && (
          <p className="text-sm text-red-400 mt-2">{saveError}</p>
        )}
        <IntroductionSignalModal
          isOpen={isModalOpen}
          initialSignal={null}
          profileName={profileName}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      </>
    );
  }

  // Filled state - combine prompt_text and response
  // prompt_text contains "___" placeholder which we replace with the response
  const parts = signal.prompt_text.split('___');
  const beforeResponse = parts[0];
  const afterResponse = parts[1] || '';

  return (
    <>
      <div className="flex justify-between items-start">
        <p className="text-white/70 text-base font-normal leading-snug flex-1">
          {beforeResponse}
          <span className="text-white/85 font-medium">{signal.response}</span>
          {afterResponse}
        </p>
        {canEdit && (
          <button
            onClick={handleEdit}
            className="ml-3 px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-sm font-medium transition-colors shrink-0"
            aria-label="Edit introduction signal"
          >
            Edit
          </button>
        )}
      </div>
      {saveError && (
        <p className="text-sm text-red-400 mt-2">{saveError}</p>
      )}
      <IntroductionSignalModal
        isOpen={isModalOpen}
        initialSignal={signal}
        profileName={profileName}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </>
  );
}

