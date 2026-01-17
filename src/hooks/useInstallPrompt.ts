'use client';

import { useState, useEffect } from 'react';
import { isIOS } from '@/utils/pwa';

// Type for the beforeinstallprompt event
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Listen for beforeinstallprompt event (Android Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle successful installation (appinstalled event)
  useEffect(() => {
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    // If we have a deferred prompt (Android Chrome), use it
    if (deferredPrompt) {
      setInstalling(true);
      try {
        // Show the install prompt
        await deferredPrompt.prompt();
        
        // Wait for user response
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          // User accepted, prompt will be cleared automatically
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.warn('Install prompt error:', error);
        // Fall through to show instructions if prompt fails
        setShowInstructions(true);
      } finally {
        setInstalling(false);
      }
    } else {
      // No prompt available (iOS or unsupported browser), show instructions
      setShowInstructions(true);
    }
  };

  return {
    triggerInstall,
    installing,
    showInstructions,
    setShowInstructions,
    hasPrompt: deferredPrompt !== null,
  };
}

