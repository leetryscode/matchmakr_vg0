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
    blue: '#2F3A4A',
    teal: '#3F6E73',
    'blue-light': '#8E9AA9',
    'teal-light': '#A9BDBC',
  },
  accent: {
    'blue-light': '#8E9AA9',
    'teal-light': '#A9BDBC',
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

