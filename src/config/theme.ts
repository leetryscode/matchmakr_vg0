/**
 * Theme Constants Bridge
 * 
 * This file provides theme constants for non-Tailwind contexts
 * (e.g., PWA manifest, metadata, inline styles, canvas rendering).
 * 
 * All values are derived from palette.ts to maintain a single source of truth.
 */

import { palette, themeColor, backgroundColor } from './palette';

/**
 * Export theme constants for use in non-Tailwind contexts
 */
export { palette, themeColor, backgroundColor };

/**
 * Helper to convert hex color to RGB values for rgba() usage
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Helper to create rgba string from hex color
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

