/**
 * Pairings Type Definitions
 * 
 * Types for the sponsor-authored "Pairings" feature on Single profile pages.
 * Allows sponsors to select up to 5 qualities describing who the single pairs well with.
 */

/**
 * Category for grouping pairing qualities (internal use only, not stored in database)
 */
export type PairingQualityCategory =
  | 'temperament'
  | 'values'
  | 'lifestyle'
  | 'social'
  | 'communication';

/**
 * Definition of a pairing quality (from config)
 */
export interface PairingQualityDefinition {
  id: string;
  label: string;
  category: PairingQualityCategory;
}

/**
 * Persisted pairings signal data shape
 * Will be stored in profiles.pairings_signal as JSONB
 */
export interface PairingsSignal {
  quality_ids: string[];
  custom_quality?: string | null; // Optional, normalized string
}

