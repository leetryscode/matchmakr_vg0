/**
 * Orbit User Roles
 * 
 * Orbit only recognizes two active roles: SINGLE and MATCHMAKR (labeled "Sponsor" in UI).
 * Vendor exists in the database but is treated as a non-participating role.
 */
export type OrbitUserRole = 'SINGLE' | 'MATCHMAKR';

/**
 * Helper function to normalize a database user type to an Orbit role.
 * Vendors are normalized to MATCHMAKR for routing purposes.
 */
export function normalizeToOrbitRole(dbUserType: string | null | undefined): OrbitUserRole | null {
  if (!dbUserType) return null;
  
  const normalized = dbUserType.toUpperCase();
  
  // Vendor users are redirected to matchmakr dashboard
  if (normalized === 'VENDOR') {
    return 'MATCHMAKR';
  }
  
  // Only SINGLE and MATCHMAKR are valid Orbit roles
  if (normalized === 'SINGLE' || normalized === 'MATCHMAKR') {
    return normalized as OrbitUserRole;
  }
  
  return null;
}

/**
 * Check if a database user type is a valid Orbit role
 */
export function isOrbitRole(dbUserType: string | null | undefined): boolean {
  if (!dbUserType) return false;
  const normalized = dbUserType.toUpperCase();
  return normalized === 'SINGLE' || normalized === 'MATCHMAKR';
}

