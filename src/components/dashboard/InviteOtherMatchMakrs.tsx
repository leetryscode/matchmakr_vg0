'use client';

import React, { useState } from 'react';

const InviteOtherMatchMakrModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
                <h2 className="type-section mb-4 text-text-dark">Invite a fellow sponsor</h2>
                <p className="text-text-light mb-6 leading-relaxed">
                    Invite a friend to join our community helping friends find love.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Their email address"
                    className="w-full border border-white/20 rounded-xl px-4 py-3 mb-4 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-white/20 text-text-dark rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-button hover:shadow-button-hover">
                        Cancel
                    </button>
                    <button onClick={() => alert(`(Not implemented) Invite would be sent to ${email}`)} className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200">
                        Send invite
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
                <h2 className="type-display mb-3">Sponsor chat</h2>
                <p className="text-white/80 text-lg leading-relaxed mb-6">Chat windows with other sponsors like you, on behalf of their sponsored singles</p>
                <div className="text-center p-12 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 mb-6">
                    <p className="text-white/70 text-lg">No sponsor chats</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold text-lg shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 py-4 px-8"
                >
                    Invite a sponsor
                </button>
            </div>
            <InviteOtherMatchMakrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
} 