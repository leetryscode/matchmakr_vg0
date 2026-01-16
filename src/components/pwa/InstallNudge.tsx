'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChatModal } from '@/contexts/ChatModalContext';

const DISMISS_STORAGE_KEY = 'orbit_install_nudge_dismissed_at';
const COOLDOWN_DAYS = 14;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function isStandaloneMode(): boolean {
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

function isMobile(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!dismissedAt) return false;
    
    const dismissedTimestamp = parseInt(dismissedAt, 10);
    if (isNaN(dismissedTimestamp)) return false;
    
    const now = Date.now();
    const timeSinceDismiss = now - dismissedTimestamp;
    
    return timeSinceDismiss < COOLDOWN_MS;
  } catch (error) {
    // If localStorage access fails, don't show nudge (fail safe)
    return true;
  }
}

function dismissNudge(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save dismiss state:', error);
  }
}

export default function InstallNudge() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { isAnyChatModalOpen } = useChatModal();
  const [isStandalone, setIsStandalone] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check standalone mode on mount and when window focus changes
  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(isStandaloneMode());
    };
    
    checkStandalone();
    window.addEventListener('focus', checkStandalone);
    
    return () => {
      window.removeEventListener('focus', checkStandalone);
    };
  }, []);

  // Determine if nudge should be shown
  useEffect(() => {
    // Must be authenticated
    if (!user) {
      setShouldShow(false);
      return;
    }

    // Must be on mobile device
    if (!isMobile()) {
      setShouldShow(false);
      return;
    }

    // Must not be standalone
    if (isStandalone) {
      setShouldShow(false);
      return;
    }

    // Must be in /dashboard scope (not chat routes)
    if (!pathname.startsWith('/dashboard')) {
      setShouldShow(false);
      return;
    }

    // Must not be on chat routes
    if (pathname === '/dashboard/chat' || pathname.startsWith('/dashboard/chat/')) {
      setShouldShow(false);
      return;
    }

    // Must not have chat modal open
    if (isAnyChatModalOpen) {
      setShouldShow(false);
      return;
    }

    // Must not be dismissed recently
    if (isDismissedRecently()) {
      setShouldShow(false);
      return;
    }

    setShouldShow(true);
  }, [user, isStandalone, pathname, isAnyChatModalOpen]);

  if (!shouldShow) {
    return null;
  }

  const ios = isIOS();

  return (
    <div className="w-full max-w-full px-4 pt-4 pb-2">
      <div className="bg-white/10 rounded-card-lg border border-white/20 shadow-card p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-white text-sm font-medium mb-1">Install Orbit</h3>
              <p className="text-white/70 text-xs">
                {ios 
                  ? 'Tap Share → Add to Home Screen.'
                  : 'Use your browser menu to install.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors"
            >
              How to install
            </button>
            <button
              onClick={() => {
                dismissNudge();
                setShouldShow(false);
              }}
              className="px-3 py-1.5 text-white/60 hover:text-white/80 text-xs transition-colors"
            >
              Not now
            </button>
          </div>

          {/* Expanded steps */}
          {isExpanded && (
            <div className="pt-2 border-t border-white/10">
              <ol className="list-decimal list-inside space-y-2 text-white/70 text-xs">
                {ios ? (
                  <>
                    <li>Tap the Share button (square with arrow)</li>
                    <li>Select "Add to Home Screen"</li>
                  </>
                ) : (
                  <>
                    <li>Tap the menu button (⋮)</li>
                    <li>Select "Install app" or "Add to Home Screen"</li>
                  </>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

