/**
 * Introduction Prompts Configuration
 * 
 * Single source of truth for all introduction prompt templates.
 * Each prompt has a stable ID and a template with {name} placeholder.
 */

import type { IntroductionPromptDefinition } from '@/types/introductionSignal';

/**
 * Maximum character length for introduction signal responses
 */
export const INTRODUCTION_SIGNAL_MAX_CHARS = 90;

/**
 * All available introduction prompts
 * 
 * Templates use {name} as a placeholder that will be replaced with the single's name.
 * The "___" placeholder indicates where the sponsor's response will be inserted.
 */
export const INTRODUCTION_PROMPTS = [
  {
    id: 'lights_up',
    template: '{name} lights up when talking about ___.',
  },
  {
    id: 'never_gets_tired',
    template: '{name} never gets tired of ___.',
  },
  {
    id: 'group_role',
    template: '{name} tends to be the one in the group who ___.',
  },
  {
    id: 'appreciated_because',
    template: 'People usually appreciate {name} because ___.',
  },
  {
    id: 'always',
    template: '{name} is the kind of person who always ___.',
  },
  {
    id: 'weekend',
    template: 'On a free weekend, {name} is usually ___.',
  },
  {
    id: 'energy',
    template: "{name}'s energy is best described as ___.",
    maxWords: 3,
  },
] as const satisfies readonly IntroductionPromptDefinition[];

