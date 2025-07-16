'use client';

import React, { useState } from 'react';

const InviteOtherMatchMakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-gray-200">
                <h2 className="font-inter font-bold text-2xl mb-4 text-primary-blue">Invite a Fellow Sponsor</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Invite a friend to join our community helping friends find love.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Their email address"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover">
                        Cancel
                    </button>
                    <button onClick={() => alert(`(Not implemented) Invite would be sent to ${email}`)} className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1">
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
            <div className="bg-white/10 p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-white/20 mb-8">
                <h2 className="font-inter font-bold text-3xl text-white mb-3">Sponsor Chat</h2>
                <p className="text-white/80 text-lg leading-relaxed mb-6">Chat windows with other Sponsors like you, on behalf of their sponsored singles =)</p>
                <div className="text-center p-12 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 mb-6">
                    <p className="text-white/70 text-lg">You have no more chats with Sponsors.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-gradient-primary text-white py-4 px-8 rounded-full font-semibold text-lg shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2"
                >
                    Invite a Sponsor!
                </button>
            </div>
            <InviteOtherMatchMakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 