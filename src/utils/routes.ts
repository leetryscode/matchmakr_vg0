/**
 * Route utility functions for consistent routing across the application.
 */

/**
 * Get the dashboard route for a given user type.
 * 
 * @param userType - The user type from the database (e.g., "SINGLE", "MATCHMAKR", "VENDOR")
 * @returns The dashboard route path for the user type, or "/dashboard/matchmakr" as fallback
 */
export function getDashboardHref(userType?: string | null): string {
    if (userType === 'SINGLE') {
        return '/dashboard/single';
    }
    
    if (userType === 'MATCHMAKR') {
        return '/dashboard/matchmakr';
    }
    
    // Default fallback for unknown, null, undefined, or other user types (e.g., "VENDOR")
    return '/dashboard/matchmakr';
}

