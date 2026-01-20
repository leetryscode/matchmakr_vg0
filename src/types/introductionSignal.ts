/**
 * Introduction Signal Type Definitions
 * 
 * Types for the sponsor-authored "Introduction Signal" feature on Single profile pages.
 * Each single has exactly one prompt + one response.
 */

/**
 * Definition of an introduction prompt (from config)
 */
export interface IntroductionPromptDefinition {
  id: string;
  template: string;
  maxWords?: number;
}

/**
 * Persisted introduction signal data shape
 * Will be stored in profiles.introduction_signal as JSONB
 */
export interface IntroductionSignal {
  prompt_id: string;
  prompt_text: string; // Template with {name} replaced, still contains "___" placeholder
  response: string; // Normalized response
}

