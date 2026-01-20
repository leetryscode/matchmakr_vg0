/**
 * Pairing Qualities Configuration
 * 
 * Single source of truth for all predefined pairing qualities.
 * Each quality has a stable ID, human-readable label, and category.
 */

import type { PairingQualityDefinition } from '@/types/pairings';

/**
 * Maximum number of pairing qualities (selected + custom) allowed per single
 */
export const MAX_PAIRING_QUALITIES = 5;

/**
 * Maximum character length for custom pairing quality
 */
export const MAX_CUSTOM_QUALITY_CHARS = 40;

/**
 * All available pairing qualities
 * 
 * Qualities are grouped by category for internal organization.
 * Categories are not stored in the database - only quality IDs are persisted.
 */
export const PAIRING_QUALITIES = [
  // Temperament
  {
    id: 'calm_under_pressure',
    label: 'Calm under pressure',
    category: 'temperament' as const,
  },
  {
    id: 'reflective',
    label: 'Reflective',
    category: 'temperament' as const,
  },
  {
    id: 'playful',
    label: 'Playful',
    category: 'temperament' as const,
  },
  {
    id: 'high_energy_expressive',
    label: 'High-energy and expressive',
    category: 'temperament' as const,
  },
  {
    id: 'curious_by_nature',
    label: 'Curious by nature',
    category: 'temperament' as const,
  },
  // Values & orientation
  {
    id: 'comfortable_with_ambition',
    label: 'Comfortable with ambition',
    category: 'values' as const,
  },
  {
    id: 'family_minded',
    label: 'Family-minded',
    category: 'values' as const,
  },
  {
    id: 'values_depth_over_volume',
    label: 'Values depth over volume',
    category: 'values' as const,
  },
  {
    id: 'growth_oriented',
    label: 'Growth-oriented',
    category: 'values' as const,
  },
  {
    id: 'appreciates_independence',
    label: 'Appreciates independence',
    category: 'values' as const,
  },
  // Lifestyle
  {
    id: 'enjoys_quiet_weekends',
    label: 'Enjoys quiet weekends',
    category: 'lifestyle' as const,
  },
  {
    id: 'thrives_on_being_active',
    label: 'Thrives on being active and on the move',
    category: 'lifestyle' as const,
  },
  {
    id: 'loves_spontaneity',
    label: 'Loves spontaneity',
    category: 'lifestyle' as const,
  },
  {
    id: 'likes_a_full_calendar',
    label: 'Likes a full calendar',
    category: 'lifestyle' as const,
  },
  {
    id: 'enjoys_getting_outdoors',
    label: 'Enjoys getting outdoors',
    category: 'lifestyle' as const,
  },
  // Social style
  {
    id: 'enjoys_one_on_one',
    label: 'Enjoys one-on-one connection',
    category: 'social' as const,
  },
  {
    id: 'naturally_draws_people_together',
    label: 'Naturally draws people together',
    category: 'social' as const,
  },
  {
    id: 'energized_by_groups',
    label: 'Energized by groups',
    category: 'social' as const,
  },
  {
    id: 'social_butterfly',
    label: 'Social butterfly',
    category: 'social' as const,
  },
  {
    id: 'great_with_new_people',
    label: 'Great with new people',
    category: 'social' as const,
  },
  // Communication & care
  {
    id: 'communicates_directly',
    label: 'Communicates directly',
    category: 'communication' as const,
  },
  {
    id: 'thoughtful_before_speaking',
    label: 'Thoughtful before speaking',
    category: 'communication' as const,
  },
  {
    id: 'comfortable_sharing_emotional_space',
    label: 'Comfortable sharing emotional space',
    category: 'communication' as const,
  },
  {
    id: 'expresses_care_through_actions',
    label: 'Expresses care through actions',
    category: 'communication' as const,
  },
  {
    id: 'expresses_care_through_words',
    label: 'Expresses care through words',
    category: 'communication' as const,
  },
] as const satisfies readonly PairingQualityDefinition[];

