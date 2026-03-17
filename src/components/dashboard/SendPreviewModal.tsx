'use client';

import React, { useState } from 'react';

interface SponsoredSingle {
    id: string;
    name: string;
    photo: string | null;
}

interface SendPreviewModalProps {
    open: boolean;
    onClose: () => void;
    targetSingleId: string;
    targetSinglePhotoUrl?: string | null;
    targetSingleName?: string | null;
    sponsoredSingles: SponsoredSingle[];
    onSend: (recipientSingleId: string) => Promise<void>;
}

export default function SendPreviewModal({
    open,
    onClose,
    targetSingleId,
    targetSinglePhotoUrl,
    targetSingleName,
    sponsoredSingles,
    onSend
}: SendPreviewModalProps) {
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    if (!open) return null;

    const handleSend = async () => {
        if (!selectedRecipientId || isSending) return;
        setIsSending(true);
        try {
            await onSend(selectedRecipientId);
            // onSend handles success/error toast and modal close
        } catch (error) {
            console.error('Error sending preview:', error);
        } finally {
            setIsSending(false);
            setSelectedRecipientId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-orbit-canvas/95 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-orbit-surface-2 rounded-2xl overflow-hidden max-w-md w-full mx-4 shadow-xl border border-orbit-border/40" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-orbit-canvas px-6 pt-6 pb-4 text-center">
                    <h2 className="text-xl font-bold text-orbit-text mb-1">
                        Send preview
                    </h2>
                    <p className="text-sm text-orbit-muted">
                        Choose one of your singles.
                    </p>
                </div>

                {/* Optional: target single thumbnail */}
                {targetSinglePhotoUrl && (
                    <div className="pt-4 flex justify-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orbit-border">
                            <img
                                src={targetSinglePhotoUrl}
                                alt={targetSingleName || 'Preview'}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}

                {/* Singles list */}
                <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
                    {sponsoredSingles.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-orbit-text font-medium mb-2">
                                You don&apos;t have any singles yet.
                            </p>
                            <p className="text-orbit-muted text-sm">
                                Invite a single to start making introductions.
                            </p>
                        </div>
                    ) : (
                        sponsoredSingles.map((single) => {
                            const isSelected = selectedRecipientId === single.id;
                            return (
                                <button
                                    key={single.id}
                                    onClick={() => setSelectedRecipientId(single.id)}
                                    disabled={isSending}
                                    className={`w-full p-4 border rounded-xl transition-all duration-200 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isSelected
                                            ? 'border-orbit-gold bg-orbit-gold/10'
                                            : 'border-orbit-border/40 bg-orbit-surface-2 hover:border-orbit-gold/50 hover:bg-orbit-gold/5'
                                    }`}
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orbit-border flex items-center justify-center bg-orbit-surface-1 flex-shrink-0">
                                        {single.photo ? (
                                            <img
                                                src={single.photo}
                                                alt={single.name || 'Single'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold text-orbit-muted">
                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-orbit-text">
                                            {single.name}
                                        </div>
                                    </div>
                                    {isSelected && isSending && (
                                        <div className="flex-shrink-0">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orbit-gold"></div>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="orbit-btn-secondary px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!selectedRecipientId || isSending}
                        className="rounded-full px-5 py-2.5 text-sm font-semibold bg-orbit-gold text-orbit-canvas hover:bg-orbit-goldDark active:bg-orbit-goldDark/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isSending ? 'Sending…' : 'Send preview'}
                    </button>
                </div>
            </div>
        </div>
    );
}
