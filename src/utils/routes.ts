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
    
    if (userType === 'VENDOR') {
        return '/dashboard/vendor';
    }
    
    // Default fallback for unknown, null, undefined
    return '/dashboard/matchmakr';
}

