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
 * Supports both #RGB and #RRGGBB formats
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle #RGB format (3 characters)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  
  // Handle #RRGGBB format (6 characters)
  if (cleanHex.length === 6) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
  
  return null;
}

/**
 * Helper to create rgba string from hex color
 * Clamps alpha between 0 and 1
 */
export function hexToRgba(hex: string, alpha: number): string {
  // Clamp alpha between 0 and 1
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${clampedAlpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

