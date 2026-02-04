/**
 * Introduction Signal Modal
 * 
 * Modal for adding/editing sponsor-authored introduction signals.
 * Allows cycling through prompts and entering a short response.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { IntroductionSignal } from '@/types/introductionSignal';
import {
  INTRODUCTION_PROMPTS,
  INTRODUCTION_SIGNAL_MAX_CHARS,
} from '@/config/introductionPrompts';
import {
  getDefaultIntroductionPrompt,
  getIntroductionPromptById,
  renderIntroductionPrompt,
  validateIntroductionResponse,
  buildIntroductionSignal,
} from '@/lib/introductionSignal';

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
  const [activePromptId, setActivePromptId] = useState<string>('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [originalPromptId, setOriginalPromptId] = useState<string>('');

  // Initialize state from initialSignal or default
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialSignal) {
      setActivePromptId(initialSignal.prompt_id);
      setResponse(initialSignal.response);
      setOriginalPromptId(initialSignal.prompt_id);
    } else {
      const defaultPrompt = getDefaultIntroductionPrompt();
      setActivePromptId(defaultPrompt.id);
      setResponse('');
      setOriginalPromptId('');
    }
    setError(null);
  }, [isOpen, initialSignal]);

  if (!isOpen) {
    return null;
  }

  const currentPrompt = getIntroductionPromptById(activePromptId);
  if (!currentPrompt) {
    return null;
  }

  const renderedPrompt = renderIntroductionPrompt(
    currentPrompt.template,
    profileName
  );

  // Get current prompt index for cycling
  const currentIndex = INTRODUCTION_PROMPTS.findIndex(
    (p) => p.id === activePromptId
  );

  const handlePreviousPrompt = () => {
    const newIndex =
      currentIndex === 0
        ? INTRODUCTION_PROMPTS.length - 1
        : currentIndex - 1;
    const newPromptId = INTRODUCTION_PROMPTS[newIndex].id;

    // Check if we need confirmation
    if (response.trim() && newPromptId !== originalPromptId) {
      const confirmed = window.confirm(
        'Change prompt? This will clear your current text.'
      );
      if (!confirmed) {
        return; // Cancel prompt change
      }
      setResponse(''); // Clear response
    }

    setActivePromptId(newPromptId);
    setError(null);
  };

  const handleNextPrompt = () => {
    const newIndex =
      currentIndex === INTRODUCTION_PROMPTS.length - 1 ? 0 : currentIndex + 1;
    const newPromptId = INTRODUCTION_PROMPTS[newIndex].id;

    // Check if we need confirmation
    if (response.trim() && newPromptId !== originalPromptId) {
      const confirmed = window.confirm(
        'Change prompt? This will clear your current text.'
      );
      if (!confirmed) {
        return; // Cancel prompt change
      }
      setResponse(''); // Clear response
    }

    setActivePromptId(newPromptId);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      // Find prompt definition
      const promptDef = getIntroductionPromptById(activePromptId);
      if (!promptDef) {
        setError('Prompt not found');
        setSaving(false);
        return;
      }

      // Validate response
      const validation = validateIntroductionResponse(response, promptDef);
      if (!validation.ok) {
        setError(validation.error || 'Validation failed');
        setSaving(false);
        return;
      }

      // Build complete signal
      const result = buildIntroductionSignal({
        promptId: activePromptId,
        response: validation.normalized,
        name: profileName,
      });

      if (!result.ok) {
        setError(result.error || 'Failed to build signal');
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

  const currentChars = response.length;
  const isResponseEmpty = !response.trim();
  const canSave = !isResponseEmpty && !saving && !error;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white/95 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-white/20">
        {/* Prompt selection */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousPrompt}
              className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 bg-white/80 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 transition-all opacity-60 hover:opacity-100"
              aria-label="Previous prompt"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="text-base text-gray-800 leading-relaxed font-medium text-left">
                {renderedPrompt}
              </p>
            </div>
            <button
              onClick={handleNextPrompt}
              className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 bg-white/80 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 transition-all opacity-60 hover:opacity-100"
              aria-label="Next prompt"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="border-t border-gray-200 mt-4"></div>
        </div>

        {/* Response input */}
        <div className="mb-6">
          <textarea
            value={response}
            onChange={(e) => {
              setResponse(e.target.value);
              setError(null);
            }}
            placeholder="Enter your response..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue resize-none text-sm"
            maxLength={INTRODUCTION_SIGNAL_MAX_CHARS}
          />
          <div className="flex justify-between items-center mt-2">
            {error && (
              <p className="text-sm text-red-600 flex-1">{error}</p>
            )}
            <p
              className={`text-xs ${
                currentChars > INTRODUCTION_SIGNAL_MAX_CHARS * 0.9
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}
            >
              {currentChars}/{INTRODUCTION_SIGNAL_MAX_CHARS}
            </p>
          </div>
          {currentPrompt.maxWords && (
            <p className="text-xs text-gray-400 mt-1">
              Maximum {currentPrompt.maxWords} words
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 h-11 min-h-[44px] rounded-cta bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

