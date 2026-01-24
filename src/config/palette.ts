/**
 * Theme Palette - Single Source of Truth
 * 
 * This file defines all theme colors used throughout the application.
 * All color values should be defined here and imported elsewhere.
 * 
 * To change the theme colors, edit ONLY this file.
 */

export const palette = {
  primary: {
    blue: '#4A5D7C',
    teal: '#5B7396',
    'blue-light': '#8E99A8',
    'teal-light': '#A5B0C2',
  },
  accent: {
    'blue-light': '#8E99A8',
    'teal-light': '#A5B0C2',
  },
  background: {
    main: '#FAFAFA',
    card: '#FFFFFF',
    'gradient-start': '#4A5D7C',
    'gradient-end': '#5B7396',
  },
  text: {
    dark: '#1F2937',
    light: '#6B7280',
  },
  border: {
    light: '#E5E7EB',
  },
} as const;

/**
 * Theme color for PWA (used in manifest and metadata)
 * Uses primary.blue as the main theme color
 */
export const themeColor = palette.primary.blue;

/**
 * Background color for PWA manifest
 * Uses primary.blue as the background color
 */
export const backgroundColor = palette.primary.blue;

