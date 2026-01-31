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
 * Surface Experiment: All-white canvas - background.main and background.card are unified
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
    main: '#FFFDF7',
    card: '#FFFDF7',
    'gradient-start': '#2F3A4A',
    'gradient-end': '#3F6E73',
  },
  text: {
    dark: '#1B2430',
    light: '#5E6A75',
  },
  border: {
    light: '#E2E6EA',
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

