/**
 * Introduction Signal Helper Utilities
 * 
 * Utilities for working with introduction signals: rendering prompts,
 * validating responses, and building complete signal objects.
 */

import type {
  IntroductionPromptDefinition,
  IntroductionSignal,
} from '@/types/introductionSignal';
import {
  INTRODUCTION_PROMPTS,
  INTRODUCTION_SIGNAL_MAX_CHARS,
} from '@/config/introductionPrompts';

/**
 * Get the default introduction prompt (lights_up)
 */
export function getDefaultIntroductionPrompt(): IntroductionPromptDefinition {
  return INTRODUCTION_PROMPTS[0];
}

/**
 * Look up an introduction prompt by ID
 * @returns Prompt definition or null if not found
 */
export function getIntroductionPromptById(
  id: string
): IntroductionPromptDefinition | null {
  return INTRODUCTION_PROMPTS.find((prompt) => prompt.id === id) ?? null;
}

/**
 * Render an introduction prompt template with a name
 * Replaces {name} placeholder with the provided name (or "This person" as fallback)
 * Preserves the "___" placeholder for the response
 * 
 * @param template The prompt template (e.g., "{name} lights up when talking about ___.")
 * @param name The single's name (optional, defaults to "This person")
 * @returns Rendered prompt text with {name} replaced
 */
export function renderIntroductionPrompt(
  template: string,
  name?: string | null
): string {
  const displayName = name?.trim() || 'This person';
  return template.replace(/{name}/g, displayName);
}

/**
 * Normalize a response string
 * - Trim whitespace
 * - Convert tabs to spaces
 * - Collapse repeated spaces
 * - Replace line breaks with single space
 * 
 * @param response Raw response string
 * @returns Normalized response string
 */
function normalizeResponse(response: string): string {
  return response
    .trim()
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with space
    .replace(/\s+/g, ' '); // Collapse repeated spaces
}

/**
 * Count words in a string
 * Splits on whitespace and filters empty strings for robust word counting
 * 
 * @param text Text to count words in
 * @returns Word count
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Validate an introduction signal response
 * 
 * @param response Raw response string to validate
 * @param promptDef Prompt definition (required) - used for maxWords validation
 * @returns Validation result with normalized response
 */
export function validateIntroductionResponse(
  response: string,
  promptDef: IntroductionPromptDefinition
): { ok: boolean; error?: string; normalized: string } {
  const normalized = normalizeResponse(response);

  // Check character limit
  if (normalized.length > INTRODUCTION_SIGNAL_MAX_CHARS) {
    return {
      ok: false,
      error: `Response must be ${INTRODUCTION_SIGNAL_MAX_CHARS} characters or less`,
      normalized,
    };
  }

  // Check word limit if specified
  if (promptDef.maxWords !== undefined) {
    const wordCount = countWords(normalized);
    if (wordCount > promptDef.maxWords) {
      return {
        ok: false,
        error: `Response must be ${promptDef.maxWords} words or less`,
        normalized,
      };
    }
  }

  return {
    ok: true,
    normalized,
  };
}

/**
 * Convenience wrapper to validate a response by prompt ID
 * Looks up the prompt definition first, then validates
 * 
 * @param response Raw response string to validate
 * @param promptId Prompt ID to validate against
 * @returns Validation result with normalized response, or error if prompt not found
 */
export function validateIntroductionResponseForPromptId(
  response: string,
  promptId: string
): { ok: boolean; error?: string; normalized: string } {
  const promptDef = getIntroductionPromptById(promptId);
  if (!promptDef) {
    return {
      ok: false,
      error: `Prompt with ID "${promptId}" not found`,
      normalized: normalizeResponse(response),
    };
  }
  return validateIntroductionResponse(response, promptDef);
}

/**
 * Build a complete IntroductionSignal object
 * Validates the response and renders the prompt template
 * 
 * @param params Object with promptId, response, and optional name
 * @returns Complete IntroductionSignal ready for storage, or validation error
 */
export function buildIntroductionSignal({
  promptId,
  response,
  name,
}: {
  promptId: string;
  response: string;
  name?: string | null;
}): { ok: true; signal: IntroductionSignal } | { ok: false; error: string } {
  // Look up prompt definition
  const promptDef = getIntroductionPromptById(promptId);
  if (!promptDef) {
    return {
      ok: false,
      error: `Prompt with ID "${promptId}" not found`,
    };
  }

  // Validate response
  const validation = validateIntroductionResponse(response, promptDef);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error || 'Validation failed',
    };
  }

  // Render prompt template with name
  const promptText = renderIntroductionPrompt(promptDef.template, name);

  // Build complete signal
  const signal: IntroductionSignal = {
    prompt_id: promptId,
    prompt_text: promptText,
    response: validation.normalized,
  };

  return {
    ok: true,
    signal,
  };
}

