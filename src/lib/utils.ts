/**
 * Utility function for className concatenation
 * Simple helper to safely merge class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

