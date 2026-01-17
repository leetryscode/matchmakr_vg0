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
      className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#4A5D7C] rounded-t-2xl p-6 max-w-md w-full shadow-xl border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">Install Orbit</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <p className="text-white/80 text-sm">Install takes a few seconds.</p>

          {/* Steps */}
          <ol className="list-decimal list-inside space-y-3 text-white/90 text-sm">
            {ios ? (
              <>
                <li className="flex items-center gap-2">
                  <span>Tap the Share icon</span>
                  <svg
                    className="w-4 h-4 inline-flex items-center justify-center text-white/80 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
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
            className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

