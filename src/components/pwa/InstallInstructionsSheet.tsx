'use client';

import React from 'react';
import { isIOS } from '@/utils/pwa';

interface InstallInstructionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallInstructionsSheet({ isOpen, onClose }: InstallInstructionsSheetProps) {
  if (!isOpen) return null;

  const ios = isIOS();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-orbit-canvas/80 flex items-end justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-orbit-surface-3 rounded-t-2xl p-6 max-w-md w-full shadow-xl border-t border-orbit-border/30"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-orbit-text text-lg font-semibold">Install Orbit</h3>
            <button
              onClick={onClose}
              className="text-orbit-muted hover:text-orbit-text transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <p className="text-orbit-text2 text-sm">Install takes a few seconds.</p>

          {/* Steps */}
          <ol className="list-decimal list-inside space-y-3 text-orbit-text text-sm">
            {ios ? (
              <>
                <li className="flex items-center gap-2">
                  <span>Tap the Share icon</span>
                  <svg
                    className="w-4 h-4 inline-flex items-center justify-center text-orbit-text2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {/* Square box with rounded corners */}
                    <rect x="6" y="10" width="12" height="12" rx="1.5" />
                    {/* Upward arrow from top center */}
                    <line x1="12" y1="10" x2="12" y2="4" />
                    <path d="M8 6l4-4 4 4" />
                  </svg>
                </li>
                <li>Tap "Add to Home Screen"</li>
              </>
            ) : (
              <>
                <li>Open browser menu (⋮)</li>
                <li>Tap "Install app"</li>
              </>
            )}
          </ol>

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 bg-orbit-surface-1/60 hover:bg-orbit-surface-1/80 border border-orbit-border/50 rounded-lg text-orbit-text text-sm font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
