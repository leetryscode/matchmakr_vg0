/**
 * Theme Palette - Single Source of Truth
 * 
 * This file defines all theme colors used throughout the application.
 * All color values should be defined here and imported elsewhere.
 * 
 * To change the theme colors, edit ONLY this file.
 * 
 * Current Palette: Pearl + Ink
 * Design tone: clean, modern, light, calm, premium
 * 
 * Restored blue-grey canvas - glass surfaces, calm and trustworthy
 */

export const palette = {
  primary: {
    blue: '#344B63',        // clear slate blue (cool, confident)
    teal: '#2F7F86',        // fresher teal with more chroma
    'blue-light': '#8E9AA9',
    'teal-light': '#AFCFD1',
  },
  accent: {
    'blue-light': '#8E9AA9',
    'teal-light': '#AFCFD1',
  },
  background: {
    main: '#566B89',
    card: '#5F7696',
    'gradient-start': '#2F3A4A',
    'gradient-end': '#3F6E73',
  },
  text: {
    dark: '#F6F8FC',
    light: '#C9D3E2',
  },
  border: {
    light: 'rgba(255, 255, 255, 0.14)',
  },
  /**
   * Status colors — semantic metadata for pill outlines/text and small indicators only.
   * Brighter, higher contrast on blue-grey canvas. Outline-only pills; text matches border.
   */
  status: {
    paused: '#A39AD6',             // brighter violet for NOT_SURE_YET on blue-grey
    invited: '#5F86C4',            // brighter blue
    needs_attention: '#E0AA3E',   // warmer amber
    in_motion: '#5FB58C',          // brighter green
    needs_introduction: '#5F86C4', // same as invited
  },
  /** Primary CTA: white fill, slate blue text. No gradients, no teal. */
  action: {
    entry: '#FFFFFF',
    'entry-hover': '#F2F5FA',
    'entry-active': '#E7EBF2',
    primary: '#FFFFFF',
    'primary-hover': '#F2F5FA',
    'primary-active': '#E7EBF2',
    secondary: '#E9EDF3',
    'secondary-hover': '#DEE3EB',
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

