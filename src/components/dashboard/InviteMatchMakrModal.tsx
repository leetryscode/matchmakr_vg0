'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteSponsorByEmail } from '@/lib/invite';

const InviteMatchMakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSendInvite = async () => {
        setIsLoading(true);
        setMessage('');

        try {
            const result = await inviteSponsorByEmail(email);
            setMessage(result.message);
            setEmail('');
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
                <h2 className="type-section mb-4 text-text-dark">Invite a sponsor</h2>
                <p className="text-text-light mb-6">
                    This person will be responsible for managing your profile and finding your matches!
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Sponsor's email address"
                    className="w-full border border-white/20 rounded-md px-3 py-2 mb-4 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                    disabled={isLoading}
                />
                {message && <p className="text-text-dark my-2">{message}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-white/20 text-text-dark rounded-md hover:bg-white/30 transition-colors" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={handleSendInvite} className="rounded-cta px-4 py-2 min-h-[44px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Invite'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteMatchMakrModal; 