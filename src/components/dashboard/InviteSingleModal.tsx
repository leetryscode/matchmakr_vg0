'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { inviteSingleByEmail } from '@/lib/invite';

interface MyCommunity {
    id: string;
    name: string;
}

interface InviteSingleModalProps {
    open: boolean;
    onClose: () => void;
    onNewSingleInvited?: (inviteId: string, inviteeName: string | null) => void;
}

export default function InviteSingleModal({ open, onClose, onNewSingleInvited }: InviteSingleModalProps) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [label, setLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [communities, setCommunities] = useState<MyCommunity[]>([]);
    const [communitiesLoading, setCommunitiesLoading] = useState(false);
    const [selectedCommunityId, setSelectedCommunityId] = useState('');

    const loadCommunities = useCallback(() => {
        setCommunitiesLoading(true);
        fetch('/api/communities/me')
            .then((res) => (res.ok ? res.json() : { communities: [] }))
            .then((data) => setCommunities(data.communities ?? []))
            .catch(() => setCommunities([]))
            .finally(() => setCommunitiesLoading(false));
    }, []);

    useEffect(() => {
        if (open) loadCommunities();
    }, [open, loadCommunities]);

    if (!open) return null;

    const handleSendInvite = async () => {
        setIsLoading(true);
        setMessage('');
        setSuccess(false);

        try {
            const result = await inviteSingleByEmail(
                email,
                label.trim() || undefined,
                selectedCommunityId || null,
            );
            setSuccess(true);
            setMessage(result.message);
            router.refresh();
            if (result.isNewInvite && result.inviteId && onNewSingleInvited) {
                // Path A: new invite — hand off to walkthrough immediately
                const capturedLabel = label.trim() || null;
                const capturedInviteId = result.inviteId;
                setEmail('');
                setLabel('');
                setSelectedCommunityId('');
                setMessage('');
                setSuccess(false);
                onClose();
                onNewSingleInvited(capturedInviteId, capturedLabel);
            } else {
                setEmail('');
                setLabel('');
                setSelectedCommunityId('');
                setTimeout(() => {
                    setMessage('');
                    setSuccess(false);
                    onClose();
                }, 1500);
            }
        } catch (error: unknown) {
            setMessage(error instanceof Error ? error.message : 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setLabel('');
        setSelectedCommunityId('');
        setMessage('');
        setSuccess(false);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            <div className="bg-orbit-surface-2 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-orbit-border/40">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-orbit-text mb-2">
                        Invite a Single
                    </h2>
                    <p className="text-orbit-muted">
                        Chats on Orbit are always on behalf of someone you know.
                    </p>
                    <p className="text-orbit-muted mt-1">
                        Invite a single to unlock messaging.
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Their name"
                            className="w-full border border-orbit-border rounded-xl px-4 py-3 text-orbit-text bg-orbit-canvas placeholder:text-orbit-muted focus:border-orbit-gold/50 focus:outline-none focus:ring-2 focus:ring-orbit-gold/30"
                            disabled={isLoading || success}
                        />
                    </div>
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@email.com"
                            className="w-full border border-orbit-border rounded-xl px-4 py-3 text-orbit-text bg-orbit-canvas placeholder:text-orbit-muted focus:border-orbit-gold/50 focus:outline-none focus:ring-2 focus:ring-orbit-gold/30"
                            disabled={isLoading || success}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && !success) {
                                    handleSendInvite();
                                }
                            }}
                        />
                    </div>
                    {communitiesLoading && (
                        <p className="text-xs text-orbit-muted">Loading your communities...</p>
                    )}
                    {!communitiesLoading && communities.length > 0 && (
                        <div>
                            <select
                                value={selectedCommunityId}
                                onChange={(e) => setSelectedCommunityId(e.target.value)}
                                className="w-full border border-orbit-border rounded-xl px-4 py-3 text-orbit-text bg-orbit-canvas focus:border-orbit-gold/50 focus:outline-none focus:ring-2 focus:ring-orbit-gold/30"
                                disabled={isLoading || success}
                            >
                                <option value="">No community (general invite)</option>
                                {communities.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-orbit-muted mt-1">
                                Optionally attach a community to this invite.
                            </p>
                        </div>
                    )}
                    {message && (
                        <p className={`text-sm ${success ? 'text-orbit-success' : 'text-orbit-warning'}`}>
                            {message}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 text-orbit-muted hover:text-orbit-text transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSendInvite}
                        disabled={isLoading || success || !email.trim()}
                        className="rounded-cta min-h-[44px] px-6 py-2 bg-orbit-gold text-orbit-canvas font-semibold focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:ring-offset-2 transition-opacity duration-200 hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Sending...' : success ? 'Invite sent' : 'Send invite'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
