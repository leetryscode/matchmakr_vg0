'use client';

import React, { useState } from 'react';
import { inviteSingleByEmail } from '@/lib/invite';

interface InviteSingleModalProps {
    open: boolean;
    onClose: () => void;
}

export default function InviteSingleModal({ open, onClose }: InviteSingleModalProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    if (!open) return null;

    const handleSendInvite = async () => {
        setIsLoading(true);
        setMessage('');
        setSuccess(false);

        try {
            const result = await inviteSingleByEmail(email);
            if (result.success) {
                setSuccess(true);
                setMessage(result.message);
                // Close modal after 2 seconds
                setTimeout(() => {
                    setEmail('');
                    setMessage('');
                    setSuccess(false);
                    onClose();
                }, 2000);
            } else {
                setMessage(result.message);
            }
        } catch (error: any) {
            setMessage(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setMessage('');
        setSuccess(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Invite a Single
                    </h2>
                    <p className="text-gray-600">
                        Chats on Orbit are always on behalf of someone you know.
                    </p>
                    <p className="text-gray-600 mt-1">
                        Invite a single to unlock messaging.
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@email.com"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:border-accent-teal-light focus:outline-none focus:ring-2 focus:ring-accent-teal-light focus:ring-opacity-50"
                        disabled={isLoading || success}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isLoading && !success) {
                                handleSendInvite();
                            }
                        }}
                    />
                    {message && (
                        <p className={`text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>
                            {message}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSendInvite}
                        disabled={isLoading || success || !email.trim()}
                        className="rounded-cta min-h-[44px] px-6 py-2 bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary"
                    >
                        {isLoading ? 'Sending...' : success ? 'Invite sent' : 'Send invite'}
                    </button>
                </div>
            </div>
        </div>
    );
}

