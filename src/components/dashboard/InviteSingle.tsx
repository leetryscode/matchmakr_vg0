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
            setMessage(data.message || 'Invite sent successfully!');
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
                <h2 className="font-inter font-bold text-2xl mb-4 text-primary-blue">Invite a Single User</h2>
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
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={handleSendInvite} className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Invite'}
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
                className="mt-6 w-full bg-gradient-accent text-gray-800 py-4 px-8 rounded-full font-semibold text-lg shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2"
            >
                Invite a Single User
            </button>
            <InviteSingleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 