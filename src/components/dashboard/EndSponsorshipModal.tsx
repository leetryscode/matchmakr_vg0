"use client";
import React from 'react';
import { createPortal } from 'react-dom';

interface EndSponsorshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sponsorName?: string;
  singleName?: string;
  isSponsorView?: boolean; // true if sponsor is ending sponsorship, false if single is ending
}

export default function EndSponsorshipModal({
  isOpen,
  onClose,
  onConfirm,
  sponsorName,
  singleName,
  isSponsorView = true
}: EndSponsorshipModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getTitle = () => {
    if (isSponsorView) {
      return `End sponsorship?`;
    } else {
      return `End sponsorship with ${sponsorName || 'your sponsor'}?`;
    }
  };

  const getDescription = () => {
    if (isSponsorView) {
      return `You'll stop managing this profile and won't be able to introduce matches for them.`;
    } else {
      return `This will permanently end your sponsorship relationship with ${sponsorName || 'your sponsor'}. The chat will be deleted and you'll need to be re-added to start again.`;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-orbit-surface-2 rounded-2xl p-8 shadow-xl max-w-sm w-full text-center mx-4">
        <h3 className="text-xl font-bold mb-4 text-orbit-warning">
          {getTitle()}
        </h3>
        <p className="mb-6 text-orbit-muted text-sm leading-relaxed">
          {getDescription()}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="px-6 py-3 bg-orbit-surface-2 text-orbit-text rounded-lg font-semibold hover:bg-orbit-surface-2 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-3 bg-orbit-warning text-orbit-canvas rounded-lg font-semibold hover:bg-orbit-warning/90 transition-colors"
            onClick={handleConfirm}
          >
            End sponsorship
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
