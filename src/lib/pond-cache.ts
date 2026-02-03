/**
 * Pond cache key and utilities.
 * Used by pond page and by components that invalidate cache on profile edits.
 */
export const POND_CACHE_KEY = 'pond_cache_v2';

export function clearPondCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(POND_CACHE_KEY);
  localStorage.removeItem('pond_cache'); // legacy key
}
