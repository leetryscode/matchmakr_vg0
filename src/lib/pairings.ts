/**
 * Pairings Helper Utilities
 * 
 * Utilities for working with pairings: querying qualities,
 * validating signals, and building complete signal objects.
 */

import type {
  PairingQualityCategory,
  PairingQualityDefinition,
  PairingsSignal,
} from '@/types/pairings';
import {
  PAIRING_QUALITIES,
  MAX_PAIRING_QUALITIES,
  MAX_CUSTOM_QUALITY_CHARS,
} from '@/config/pairingQualities';

/**
 * Get all pairing qualities
 */
export function getAllPairingQualities(): readonly PairingQualityDefinition[] {
  return PAIRING_QUALITIES;
}

/**
 * Get pairing qualities filtered by category
 * 
 * @param category Category to filter by
 * @returns Array of qualities in the specified category
 */
export function getPairingQualitiesByCategory(
  category: PairingQualityCategory
): readonly PairingQualityDefinition[] {
  return PAIRING_QUALITIES.filter((quality) => quality.category === category);
}

/**
 * Look up a pairing quality by ID
 * 
 * @param id Quality ID to look up
 * @returns Quality definition or null if not found
 */
export function getPairingQualityById(
  id: string
): PairingQualityDefinition | null {
  return PAIRING_QUALITIES.find((quality) => quality.id === id) ?? null;
}

/**
 * Normalize a custom quality string
 * - Trim whitespace
 * - Convert tabs to spaces
 * - Collapse repeated spaces
 * - Replace line breaks with single space
 * 
 * @param customQuality Raw custom quality string
 * @returns Normalized custom quality string
 */
function normalizeCustomQuality(customQuality: string): string {
  return customQuality
    .trim()
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with space
    .replace(/\s+/g, ' '); // Collapse repeated spaces
}

/**
 * Validate a pairings signal
 * 
 * @param signal PairingsSignal to validate
 * @returns Validation result with normalized signal, or error
 */
export function validatePairingsSignal(
  signal: PairingsSignal
): { ok: true; normalized: PairingsSignal } | { ok: false; error: string } {
  // Validate quality_ids is an array
  if (!Array.isArray(signal.quality_ids)) {
    return {
      ok: false,
      error: 'quality_ids must be an array',
    };
  }

  // Validate all quality IDs exist
  for (const qualityId of signal.quality_ids) {
    if (typeof qualityId !== 'string') {
      return {
        ok: false,
        error: 'All quality_ids must be strings',
      };
    }
    if (!getPairingQualityById(qualityId)) {
      return {
        ok: false,
        error: `Quality with ID "${qualityId}" not found`,
      };
    }
  }

  // Normalize custom quality if provided
  let normalizedCustomQuality: string | null = null;
  if (signal.custom_quality) {
    if (typeof signal.custom_quality !== 'string') {
      return {
        ok: false,
        error: 'custom_quality must be a string',
      };
    }
    normalizedCustomQuality = normalizeCustomQuality(signal.custom_quality);

    // Check character limit
    if (normalizedCustomQuality.length > MAX_CUSTOM_QUALITY_CHARS) {
      return {
        ok: false,
        error: `Custom quality must be ${MAX_CUSTOM_QUALITY_CHARS} characters or less`,
      };
    }

    // Empty after normalization is treated as null
    if (normalizedCustomQuality.length === 0) {
      normalizedCustomQuality = null;
    }
  }

  // Count total qualities (selected + custom if present)
  const totalQualities =
    signal.quality_ids.length + (normalizedCustomQuality ? 1 : 0);

  // Check maximum total qualities
  if (totalQualities > MAX_PAIRING_QUALITIES) {
    return {
      ok: false,
      error: `Maximum of ${MAX_PAIRING_QUALITIES} total qualities allowed`,
    };
  }

  // Build normalized signal
  const normalized: PairingsSignal = {
    quality_ids: signal.quality_ids,
    custom_quality: normalizedCustomQuality || undefined,
  };

  return {
    ok: true,
    normalized,
  };
}

/**
 * Build a complete PairingsSignal object
 * Validates quality IDs and normalizes custom quality
 * 
 * @param params Object with qualityIds array and optional customQuality
 * @returns Complete PairingsSignal ready for storage, or validation error
 */
export function buildPairingsSignal({
  qualityIds,
  customQuality,
}: {
  qualityIds: string[];
  customQuality?: string | null;
}): { ok: true; signal: PairingsSignal } | { ok: false; error: string } {
  // Validate all quality IDs exist
  for (const qualityId of qualityIds) {
    if (!getPairingQualityById(qualityId)) {
      return {
        ok: false,
        error: `Quality with ID "${qualityId}" not found`,
      };
    }
  }

  // Build signal object
  const signal: PairingsSignal = {
    quality_ids: qualityIds,
    custom_quality: customQuality || undefined,
  };

  // Validate the complete signal
  const validation = validatePairingsSignal(signal);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    signal: validation.normalized,
  };
}

