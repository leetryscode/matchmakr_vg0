/**
 * PWA Utility Functions
 * Shared utilities for detecting standalone mode and platform
 */

export function isStandaloneMode(): boolean {
  // Check for display-mode: standalone
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
  }
  
  // iOS Safari fallback
  if (typeof navigator !== 'undefined' && (navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isMobile(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
}

