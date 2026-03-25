/**
 * IntroductionSignalInput
 *
 * Controlled prompt carousel + response textarea.
 * Manages prompt selection and response text internally; reports built signal via onChange.
 * Used by IntroductionSignalModal (profile edit) and DraftProfileWalkthrough (invite draft).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { IntroductionSignal } from '@/types/introductionSignal';
import { INTRODUCTION_PROMPTS, INTRODUCTION_SIGNAL_MAX_CHARS } from '@/config/introductionPrompts';
import {
  getDefaultIntroductionPrompt,
  getIntroductionPromptById,
  renderIntroductionPrompt,
  buildIntroductionSignal,
} from '@/lib/introductionSignal';

interface IntroductionSignalInputProps {
  initialSignal?: IntroductionSignal | null;
  profileName: string | null;
  /** Called with the built signal whenever prompt or response changes, or null if response is empty. */
  onChange: (signal: IntroductionSignal | null) => void;
  disabled?: boolean;
}

export default function IntroductionSignalInput({
  initialSignal,
  profileName,
  onChange,
  disabled = false,
}: IntroductionSignalInputProps) {
  const [activePromptId, setActivePromptId] = useState<string>(
    () => initialSignal?.prompt_id ?? getDefaultIntroductionPrompt().id
  );
  const [response, setResponse] = useState(initialSignal?.response ?? '');
  const [originalPromptId] = useState(initialSignal?.prompt_id ?? '');

  useEffect(() => {
    if (initialSignal) {
      setActivePromptId(initialSignal.prompt_id);
      setResponse(initialSignal.response);
    } else {
      setActivePromptId(getDefaultIntroductionPrompt().id);
      setResponse('');
    }
  }, [initialSignal]);

  const currentPrompt = getIntroductionPromptById(activePromptId);
  const renderedPrompt = currentPrompt
    ? renderIntroductionPrompt(currentPrompt.template, profileName)
    : '';
  const currentIndex = INTRODUCTION_PROMPTS.findIndex((p) => p.id === activePromptId);

  const buildAndNotify = (promptId: string, resp: string) => {
    if (!resp.trim()) {
      onChange(null);
      return;
    }
    const result = buildIntroductionSignal({ promptId, response: resp, name: profileName });
    onChange(result.ok ? result.signal : null);
  };

  const changePrompt = (newIndex: number) => {
    const newPromptId = INTRODUCTION_PROMPTS[newIndex].id;
    if (response.trim() && newPromptId !== originalPromptId) {
      const confirmed = window.confirm('Change prompt? This will clear your current text.');
      if (!confirmed) return;
      setResponse('');
      setActivePromptId(newPromptId);
      onChange(null);
    } else {
      setActivePromptId(newPromptId);
      buildAndNotify(newPromptId, response);
    }
  };

  const handlePreviousPrompt = () => {
    const newIndex =
      currentIndex === 0 ? INTRODUCTION_PROMPTS.length - 1 : currentIndex - 1;
    changePrompt(newIndex);
  };

  const handleNextPrompt = () => {
    const newIndex =
      currentIndex === INTRODUCTION_PROMPTS.length - 1 ? 0 : currentIndex + 1;
    changePrompt(newIndex);
  };

  const handleResponseChange = (value: string) => {
    setResponse(value);
    buildAndNotify(activePromptId, value);
  };

  if (!currentPrompt) return null;

  return (
    <div>
      {/* Prompt carousel */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreviousPrompt}
            disabled={disabled}
            className="flex-shrink-0 w-9 h-9 rounded-full border border-orbit-border bg-orbit-surface-2 hover:bg-orbit-surface-1 hover:border-orbit-border focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 transition-all opacity-60 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous prompt"
          >
            <ChevronLeftIcon className="w-5 h-5 text-orbit-muted" />
          </button>
          <div className="flex-1">
            <p className="text-base text-orbit-text leading-relaxed font-medium text-left">
              {renderedPrompt}
            </p>
          </div>
          <button
            onClick={handleNextPrompt}
            disabled={disabled}
            className="flex-shrink-0 w-9 h-9 rounded-full border border-orbit-border bg-orbit-surface-2 hover:bg-orbit-surface-1 hover:border-orbit-border focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 transition-all opacity-60 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next prompt"
          >
            <ChevronRightIcon className="w-5 h-5 text-orbit-muted" />
          </button>
        </div>
        <div className="border-t border-orbit-border mt-4" />
      </div>

      {/* Response input */}
      <div>
        <textarea
          value={response}
          onChange={(e) => handleResponseChange(e.target.value)}
          placeholder="Enter your response..."
          rows={2}
          disabled={disabled}
          className="w-full px-4 py-3 border border-orbit-border rounded-lg bg-orbit-surface-2 text-orbit-text placeholder:text-orbit-muted focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:border-orbit-gold/50 resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={INTRODUCTION_SIGNAL_MAX_CHARS}
        />
        <div className="flex justify-end items-center mt-1">
          <p className="text-xs text-orbit-muted">
            {response.length}/{INTRODUCTION_SIGNAL_MAX_CHARS}
          </p>
        </div>
        {currentPrompt.maxWords && (
          <p className="text-xs text-orbit-muted mt-1">
            Maximum {currentPrompt.maxWords} words
          </p>
        )}
      </div>
    </div>
  );
}
