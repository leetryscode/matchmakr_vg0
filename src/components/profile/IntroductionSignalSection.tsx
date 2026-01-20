/**
 * Introduction Signal Section
 * 
 * Displays the sponsor-authored introduction signal on Single profile pages.
 * Shows empty state with default prompt or filled state with prompt + response.
 */

'use client';

import React from 'react';
import type { IntroductionSignal } from '@/types/introductionSignal';
import {
  getDefaultIntroductionPrompt,
  renderIntroductionPrompt,
} from '@/lib/introductionSignal';

interface IntroductionSignalSectionProps {
  introductionSignal: any | null; // JSONB from database
  firstName: string;
  onAdd?: () => void;
  onEdit?: () => void;
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
  onAdd,
  onEdit,
}: IntroductionSignalSectionProps) {
  const signal = parseIntroductionSignal(introductionSignal);
  const isEmpty = !signal;
  const defaultPrompt = getDefaultIntroductionPrompt();
  const displayName = firstName || 'This person';

  // Empty state
  if (isEmpty) {
    const renderedPrompt = renderIntroductionPrompt(
      defaultPrompt.template,
      displayName
    );

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white/90 font-semibold">Conversation hook</h2>
          {onAdd && (
            <button
              onClick={onAdd}
              className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-xs font-semibold transition-colors"
              aria-label="Add introduction signal"
            >
              Add
            </button>
          )}
        </div>
        <div className="relative pt-2 pb-2 pl-4 pr-4">
          <span
            aria-hidden
            className="pointer-events-none select-none absolute left-0 top-0 text-white/20 text-3xl leading-none"
            style={{
              fontFamily:
                'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
            }}
          >
            "
          </span>
          <p className="text-white/50 text-sm leading-relaxed">
            {renderedPrompt}
          </p>
          <span
            aria-hidden
            className="pointer-events-none select-none absolute right-0 bottom-0 text-white/20 text-3xl leading-none"
            style={{
              fontFamily:
                'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
            }}
          >
            "
          </span>
        </div>
      </div>
    );
  }

  // Filled state - combine prompt_text and response
  // prompt_text contains "___" placeholder which we replace with the response
  const parts = signal.prompt_text.split('___');
  const beforeResponse = parts[0];
  const afterResponse = parts[1] || '';

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-white/90 font-semibold">Conversation hook</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 text-xs font-semibold transition-colors"
            aria-label="Edit introduction signal"
          >
            Edit
          </button>
        )}
      </div>
      <div className="relative pt-2 pb-2 pl-4 pr-4">
        <span
          aria-hidden
          className="pointer-events-none select-none absolute left-0 top-0 text-white/20 text-3xl leading-none"
          style={{
            fontFamily:
              'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          }}
        >
          "
        </span>
        <p className="text-white/70 text-sm leading-relaxed">
          {beforeResponse}
          <span className="text-white/90 font-medium">{signal.response}</span>
          {afterResponse}
        </p>
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-0 bottom-0 text-white/20 text-3xl leading-none"
          style={{
            fontFamily:
              'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          }}
        >
          "
        </span>
      </div>
    </div>
  );
}

