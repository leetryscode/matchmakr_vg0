'use client';

import React, { useState } from 'react';
import { inviteSponsorToJoinByEmail } from '@/lib/invite';
import Toast from '@/components/ui/Toast';

const InviteOtherMatchMakrModal = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: { isOpen: boolean; onClose: () => void; onSuccess?: (email: string) => void; onError?: (message: string) => void }) => {
    if (!isOpen) return null;

    const [email, setEmail] = useState('');
    const [label, setLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!email.trim()) return;
        setIsLoading(true);
        try {
            await inviteSponsorToJoinByEmail(email.trim(), label.trim() || undefined);
            onSuccess?.(email.trim());
            setEmail('');
            setLabel('');
            onClose();
        } catch (err) {
            onError?.(err instanceof Error ? err.message : 'Failed to send invite.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
                <h2 className="type-section mb-4">Invite a fellow sponsor</h2>
                <p className="text-orbit-muted mb-6 leading-relaxed">
                    Invite a friend to join our community helping friends find love.
                </p>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Name (optional)"
                    className="orbit-ring w-full border border-orbit-border/50 rounded-xl px-4 py-3 mb-3 text-orbit-text placeholder:text-orbit-muted bg-orbit-surface/80"
                />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Their email address"
                    className="orbit-ring w-full border border-orbit-border/50 rounded-xl px-4 py-3 mb-4 text-orbit-text placeholder:text-orbit-muted bg-orbit-surface/80"
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="orbit-btn-secondary px-6 py-3 rounded-lg font-semibold" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !email.trim()}
                        className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Sending...' : 'Send invite'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function InviteOtherMatchMakrs() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSuccess = (email: string) => {
        setToast({ message: `Invite sent to ${email}`, type: 'success' });
    };

    const handleError = (message: string) => {
        setToast({ message, type: 'error' });
    };

    return (
        <>
            <div className="bg-white/10 p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-white/20 mb-8">
                <h2 className="type-display mb-3">Sponsor chat</h2>
                <p className="text-orbit-text2 text-lg leading-relaxed mb-6">Chat windows with other sponsors like you, on behalf of their sponsored singles</p>
                <div className="text-center p-12 bg-white/10 rounded-2xl border-2 border-dashed border-white/20 mb-6">
                    <p className="text-orbit-muted text-lg">No sponsor chats</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold text-lg shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 py-4 px-8"
                >
                    Invite a sponsor
                </button>
            </div>
            <InviteOtherMatchMakrModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                onError={handleError}
            />
            {toast && (
                <Toast message={toast.message} type={toast.type} isVisible onClose={() => setToast(null)} />
            )}
        </>
    );
} 