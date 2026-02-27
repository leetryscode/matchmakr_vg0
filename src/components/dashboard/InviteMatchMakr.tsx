'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteSponsorByEmail } from '@/lib/invite';

const InviteMatchmakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
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
            <div className="orbit-surface-strong rounded-lg p-8 w-full max-w-md text-center border border-orbit-border/50">
                <h2 className="type-section mb-4">Invite a sponsor</h2>
                <p className="text-orbit-muted mb-6">
                    This person will be responsible for managing your profile and finding your matches!
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Sponsor's email address"
                    className="orbit-ring w-full border border-orbit-border/50 rounded-md px-3 py-2 mb-4 text-orbit-text placeholder:text-orbit-muted bg-orbit-surface/80"
                    disabled={isLoading}
                />
                {message && <p className="text-orbit-text my-2">{message}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="orbit-btn-secondary px-4 py-2 rounded-md" disabled={isLoading}>
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

export default function InviteMatchMakr() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="orbit-surface p-6 rounded-lg shadow-card mt-8 border border-orbit-border/50">
                <h2 className="type-section mb-4">Chat with my sponsor</h2>
                <div className="mt-4 p-4 border border-gray-200 rounded-lg flex items-center justify-between bg-gray-50">
                    <span className="text-gray-700">Chat with the user who manages your profile!</span>
                    <button className="rounded-cta px-4 py-2 min-h-[44px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200">
                        View Profile
                    </button>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 w-full rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 py-3"
                >
                    Invite someone to be my Sponsor!
                </button>
            </div>
            <InviteMatchmakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 