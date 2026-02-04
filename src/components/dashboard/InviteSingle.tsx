'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const InviteSingleModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();

    const handleSendInvite = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const { data, error } = await supabase.functions.invoke('sponsor-single', {
                body: { single_email: email },
            });
            if (error) {
                let errorMsg = error.message;
                if (error?.data?.error) {
                    errorMsg = error.data.error;
                } else if (typeof error === 'string') {
                    errorMsg = error;
                }
                throw new Error(errorMsg || 'An error occurred.');
            }
            setMessage(data.message || 'Invite sent');
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            setMessage(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
                <h2 className="type-section mb-4 text-text-dark">Invite a single user</h2>
                <p className="text-text-light mb-6 leading-relaxed">
                    Invite a single user to find matches for.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Single user's email address"
                    className="w-full border border-white/20 rounded-xl px-4 py-3 mb-4 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                    disabled={isLoading}
                />
                {message && <p className="text-text-dark my-2">{message}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-white/20 text-text-dark rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-button hover:shadow-button-hover" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={handleSendInvite} className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send invite'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function InviteSingle() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-full font-semibold text-lg border border-white/30 shadow-deep transition-all duration-300 hover:-translate-y-2"
            >
                Invite a single user
            </button>
            <InviteSingleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 