'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const InviteMatchmakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();

    const handleSendInvite = async () => {
        console.log('Attempting to invoke function. Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        setIsLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.functions.invoke('sponsor-user', {
                body: { matchmakr_email: email },
            });

            if (error) {
                // Try to show the most informative error message
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
              onClose(); // Close modal on success
              window.location.reload(); // Refresh to show updated state
            }, 2000);

        } catch (error: any) {
            setMessage(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-primary-blue">Invite a MatchMakr</h2>
                <p className="text-gray-600 mb-6">
                    This person will be responsible for managing your profile and finding your matches!
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="MatchMakr's email address"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-gray-800 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                    disabled={isLoading}
                />
                {message && <p className="text-gray-800 my-2">{message}</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={handleSendInvite} className="px-4 py-2 bg-gradient-primary text-white rounded-md hover:bg-gradient-light transition-all duration-300 shadow-button hover:shadow-button-hover" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Invite'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function InviteMatchMakr() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const supabase = createClient();

    const handleInvite = async (email: string) => {
        console.log('Attempting to invoke function. Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

        // This is a placeholder for the actual logic that will be inside the modal
        alert(`(Not implemented) Invite would be sent to ${email}`);
    };

    return (
        <>
            <div className="bg-background-card p-6 rounded-lg shadow-card mt-8 border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-primary-blue">Chat With my MatchMakr</h2>
                <div className="mt-4 p-4 border border-gray-200 rounded-lg flex items-center justify-between bg-gray-50">
                    <span className="text-gray-700">Chat with the user who manages your profile!</span>
                    <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg hover:bg-gradient-light transition-all duration-300 shadow-button hover:shadow-button-hover">
                        View Profile
                    </button>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 w-full bg-gradient-light text-white py-3 rounded-lg hover:bg-gradient-primary font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover"
                >
                    Invite someone to be my MatchMakr!
                </button>
            </div>
            <InviteMatchmakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 