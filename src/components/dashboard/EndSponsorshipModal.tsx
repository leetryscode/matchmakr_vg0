"use client";
import React from 'react';

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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center mx-4">
        <h3 className="text-xl font-bold mb-4 text-red-600">
          {getTitle()}
        </h3>
        <p className="mb-6 text-gray-600 text-sm leading-relaxed">
          {getDescription()}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            onClick={handleConfirm}
          >
            End sponsorship
          </button>
        </div>
      </div>
    </div>
  );
} 