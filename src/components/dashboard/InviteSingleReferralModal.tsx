'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteSingleReferralByEmail } from '@/lib/invite';

const InviteSingleReferralModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  if (!isOpen) return null;

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendInvite = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      await inviteSingleReferralByEmail(email, label.trim() || undefined);
      onSuccess?.();
      setEmail('');
      setLabel('');
      onClose();
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center border border-white/20">
        <h2 className="type-section mb-4 text-text-dark">Invite a Single</h2>
        <p className="text-text-light mb-6">
          Invite someone you trust to join Orbit.
        </p>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name (optional)"
          className="w-full border border-white/20 rounded-md px-3 py-2 mb-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
          disabled={isLoading}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full border border-white/20 rounded-md px-3 py-2 mb-4 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
          disabled={isLoading}
        />
        {message && <p className="text-text-dark my-2">{message}</p>}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/20 text-text-dark rounded-md hover:bg-white/30 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            className="rounded-cta px-4 py-2 min-h-[44px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteSingleReferralModal;
