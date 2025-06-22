'use client';

import React, { useState } from 'react';

const InviteOtherMatchMakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Invite a Fellow MatchMakr</h2>
                <p className="text-gray-600 mb-6">
                    Invite a friend to join our community helping friends find love.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Their email address"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-gray-900"
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onClick={() => alert(`(Not implemented) Invite would be sent to ${email}`)} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-500">
                        Send Invite
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function InviteOtherMatchMakrs() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">MatchMakr Chat</h2>
                <p className="text-gray-600">Chat windows with other MatchMakrs like you, on behalf of their sponsored singles =)</p>
                <div className="mt-4 p-4 border rounded-lg">
                    <p className="text-center text-gray-500">You have no more chats with MatchMakrs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold"
                >
                    Invite a MatchMakr!
                </button>
            </div>
            <InviteOtherMatchMakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 