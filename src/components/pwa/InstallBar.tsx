'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatModal } from '@/contexts/ChatModalContext';
import { isStandaloneMode } from '@/utils/pwa';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import InstallInstructionsSheet from './InstallInstructionsSheet';

export default function InstallBar() {
  const { user } = useAuth();
  const { isAnyChatModalOpen } = useChatModal();
  const [isStandalone, setIsStandalone] = useState(true);
  const { triggerInstall, installing, showInstructions, setShowInstructions } = useInstallPrompt();

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

  // Handle successful installation (appinstalled event)
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Don't show if:
  // - Not authenticated
  // - Already in standalone mode
  // - Chat modal is open (optional, but helps avoid UI conflicts)
  if (!user || isStandalone || isAnyChatModalOpen) {
    return null;
  }

  return (
    <>
      {/* Sticky install bar */}
      <div className="sticky top-0 z-40 w-full bg-[#4A5D7C] border-b border-white/10 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">
              Orbit works better in app mode — install for full access.
            </p>
          </div>
          <button
            onClick={triggerInstall}
            disabled={installing}
            className="flex-shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {installing ? 'Installing...' : 'Install Orbit'}
          </button>
        </div>
      </div>

      {/* Install instructions sheet */}
      {showInstructions && (
        <InstallInstructionsSheet
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </>
  );
}

