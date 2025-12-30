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
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-gray-200">
                <h2 className="font-inter font-bold text-2xl mb-4 text-primary-blue">Invite a single user</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Invite a single user to find matches for.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Single user's email address"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                    disabled={isLoading}
                />
                {message && <p className="text-gray-800 my-2">{message}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={handleSendInvite} className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1" disabled={isLoading}>
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