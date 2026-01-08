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

    const handleRecipientSelect = async (recipientId: string) => {
        if (isSending) return;
        
        setSelectedRecipientId(recipientId);
        setIsSending(true);

        try {
            await onSend(recipientId);
            // onSend handles success/error and closing
        } catch (error) {
            // Error is handled by parent via toast
            console.error('Error sending preview:', error);
        } finally {
            setIsSending(false);
            setSelectedRecipientId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Send preview
                    </h2>
                    <p className="text-gray-600">
                        Choose one of your singles.
                    </p>
                </div>

                {/* Optional: Show target single thumbnail */}
                {targetSinglePhotoUrl && (
                    <div className="mb-4 flex justify-center">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                            <img
                                src={targetSinglePhotoUrl}
                                alt={targetSingleName || 'Preview'}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                    {sponsoredSingles.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-900 font-medium mb-2">
                                You don't have any singles yet.
                            </p>
                            <p className="text-gray-600 text-sm">
                                Invite a single to start making introductions.
                            </p>
                        </div>
                    ) : (
                        sponsoredSingles.map((single) => {
                            const isSelected = selectedRecipientId === single.id;
                            const isDisabled = isSending && !isSelected;

                            return (
                                <button
                                    key={single.id}
                                    onClick={() => handleRecipientSelect(single.id)}
                                    disabled={isDisabled}
                                    className={`w-full p-4 border rounded-xl transition-all duration-200 flex items-center space-x-3 ${
                                        isSelected
                                            ? 'border-accent-teal-light bg-accent-teal-light/10'
                                            : isDisabled
                                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-accent-teal-light hover:bg-accent-teal-light/5'
                                    }`}
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100 flex-shrink-0">
                                        {single.photo ? (
                                            <img
                                                src={single.photo}
                                                alt={single.name || 'Single'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold text-gray-500">
                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-gray-900">
                                            {single.name}
                                        </div>
                                    </div>
                                    {isSelected && isSending && (
                                        <div className="flex-shrink-0">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-teal-light"></div>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

