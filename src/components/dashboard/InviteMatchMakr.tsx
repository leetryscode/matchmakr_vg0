'use client';

import React, { useState } from 'react';

const InviteMatchmakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Invite a MatchMakr</h2>
                <p className="text-gray-600 mb-6">
                    This person will be responsible for managing your profile and finding your matches!
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="MatchMakr's email address"
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

export default function InviteMatchMakr() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h2 className="text-2xl font-bold mb-4">Chat With my MatchMakr</h2>
                <div className="mt-4 p-4 border rounded-lg flex items-center justify-between">
                    <span className="text-gray-700">Chat with the user who manages your profile!</span>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        View Profile
                    </button>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold"
                >
                    Invite someone to be my MatchMakr!
                </button>
            </div>
            <InviteMatchmakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 