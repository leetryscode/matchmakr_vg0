'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isStandaloneMode } from '@/utils/pwa';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardHref } from '@/utils/routes';
import InstallInstructionsSheet from './InstallInstructionsSheet';

interface RequireStandaloneGateProps {
  enabled: boolean;
  title: string;
  body: string;
  ctaLabel?: string;
  showBackButton?: boolean;
  backRoute?: string;
  children: React.ReactNode;
}

export default function RequireStandaloneGate({
  enabled,
  title,
  body,
  ctaLabel = 'Install Orbit',
  showBackButton = false,
  backRoute,
  children,
}: RequireStandaloneGateProps) {
  const router = useRouter();
  const { userType } = useAuth();
  const [isStandalone, setIsStandalone] = useState(true);
  const { triggerInstall, installing, showInstructions, setShowInstructions } = useInstallPrompt();
  
  // Use user's role-based dashboard route, or fallback to /dashboard/matchmakr
  const defaultBackRoute = backRoute || getDashboardHref(userType) || '/dashboard/matchmakr';

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

  // If not enabled or already in standalone mode, render children normally
  if (!enabled || isStandalone) {
    return <>{children}</>;
  }

  // Blocking overlay
  return (
    <>
      {/* Render children but they'll be hidden behind overlay */}
      <div className="hidden">{children}</div>

      {/* Full-screen blocking overlay */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-primary-blue rounded-2xl p-6 max-w-md w-full shadow-xl border border-white/10">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <h3 className="text-white text-xl font-semibold text-center">
              {title}
            </h3>

            {/* Body */}
            <p className="text-white/80 text-sm text-center leading-relaxed">
              {body}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-2">
              {/* Primary CTA */}
              <button
                onClick={triggerInstall}
                disabled={installing}
                className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {installing ? 'Installing...' : ctaLabel}
              </button>

              {/* Secondary: Back button (if enabled) */}
              {showBackButton && (
                <button
                  onClick={() => router.push(defaultBackRoute)}
                  className="w-full px-4 py-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-lg text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
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

