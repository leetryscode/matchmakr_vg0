/**
 * Pond cache key and utilities.
 * Used by pond page and by components that invalidate cache on profile edits.
 *
 * Cache key format: pond_cache_v4:<selected_single_id>:<city>:<state>:<zip>:<interestsHash>:<communitiesHash>
 * Isolates caches per selected single + search params for Step 2 filtering.
 */
export const POND_CACHE_KEY_PREFIX = 'pond_cache_v4';

export type PondCacheKeyParams = {
  selectedSingleId: string | null;
  city: string;
  state: string;
  zip: string;
  selectedInterests: { id: number; name: string }[];
  selectedCommunityIds: string[];
};

/**
 * Build cache key for Pond data. Isolates cache per selected single + search params.
 */
export function getPondCacheKey(params: PondCacheKeyParams): string {
  const singleId = params.selectedSingleId || 'none';
  const interestsHash = params.selectedInterests
    .map((i) => i.id)
    .sort((a, b) => a - b)
    .join(',');
  const communitiesHash = params.selectedCommunityIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .sort((a, b) => a.localeCompare(b))
    .join(',');
  return `${POND_CACHE_KEY_PREFIX}:${singleId}:${params.city}:${params.state}:${params.zip}:${interestsHash}:${communitiesHash}`;
}

/**
 * Clear all Pond caches. Used when profile edits invalidate cached data.
 */
export function clearPondCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(POND_CACHE_KEY_PREFIX) || key === 'pond_cache')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
