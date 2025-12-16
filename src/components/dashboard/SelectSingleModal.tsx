'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface SponsoredSingle {
    id: string;
    name: string | null;
    photo: string | null;
}

interface SelectSingleModalProps {
    open: boolean;
    onClose: () => void;
    sponsoredSingles: SponsoredSingle[];
    onSelectSingle: (singleId: string) => void;
    otherMatchmakrName: string;
    // Add props for chat navigation
    currentUserId?: string;
    otherUserId?: string;
    clickedSingleId?: string;
    showMysterySingle?: boolean;
    currentSelectedSingleId?: string;
}

const MYSTERY_SINGLE = {
    id: 'MYSTERY_SINGLE',
    name: 'Mystery Single',
    photo: null
};

export default function SelectSingleModal({
    open,
    onClose,
    sponsoredSingles,
    onSelectSingle,
    otherMatchmakrName,
    currentUserId,
    otherUserId,
    clickedSingleId,
    showMysterySingle = false,
    currentSelectedSingleId
}: SelectSingleModalProps) {
    const router = useRouter();

    const handleSingleSelected = async (singleId: string) => {
        if (currentUserId && otherUserId && clickedSingleId) {
            // Always use the lower/higher of the two single IDs
            let aId = singleId;
            let bId = clickedSingleId;
            if (aId > bId) {
                const temp = aId;
                aId = bId;
                bId = temp;
            }
            // Navigate to the new chat page
            const res = await fetch(`/api/messages/chat-context?userId=${currentUserId}&otherId=${otherUserId}&about_single_id=${aId}&clicked_single_id=${bId}`);
            const data = await res.json();
            if (data && data.conversation_id) {
                router.push(`/dashboard/chat/${data.conversation_id}`);
                onClose();
                return;
            }
        }
        // Fallback to the original callback
        onSelectSingle(singleId);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Which of your singles?
                    </h2>
                    <p className="text-gray-600">
                        Select which of your singles this chat with {otherMatchmakrName} is about.
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {sponsoredSingles.map((single) => (
                        <button
                            key={single.id}
                            onClick={() => handleSingleSelected(single.id)}
                            className={`w-full p-4 border rounded-xl hover:border-accent-teal-light hover:bg-accent-teal-light/5 transition-all duration-200 flex items-center space-x-3 ${
                                currentSelectedSingleId === single.id
                                    ? 'border-accent-teal-light bg-accent-teal-light/10'
                                    : 'border-gray-200'
                            }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100">
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
                            {currentSelectedSingleId === single.id && (
                                <div className="text-accent-teal-light">✓</div>
                            )}
                        </button>
                    ))}
                    
                    {/* Show "Someone Else" option if only one single, or "Mystery Single" if showMysterySingle is true */}
                    {(showMysterySingle || sponsoredSingles.length === 1) && (
                        <button
                            onClick={() => handleSingleSelected(MYSTERY_SINGLE.id)}
                            className={`w-full p-4 border rounded-xl hover:border-accent-teal-light hover:bg-accent-teal-light/5 transition-all duration-200 flex items-center space-x-3 ${
                                currentSelectedSingleId === MYSTERY_SINGLE.id
                                    ? 'border-accent-teal-light bg-accent-teal-light/10'
                                    : 'border-gray-200'
                            }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                                <span className="text-lg font-bold text-gray-500">?</span>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-semibold text-gray-900">
                                    {sponsoredSingles.length === 1 ? 'Someone Else' : MYSTERY_SINGLE.name}
                                </div>
                            </div>
                            {currentSelectedSingleId === MYSTERY_SINGLE.id && (
                                <div className="text-accent-teal-light">✓</div>
                            )}
                        </button>
                    )}
                    
                    {/* If no singles, only show mystery single */}
                    {sponsoredSingles.length === 0 && showMysterySingle && (
                        <button
                            onClick={() => handleSingleSelected(MYSTERY_SINGLE.id)}
                            className={`w-full p-4 border rounded-xl hover:border-accent-teal-light hover:bg-accent-teal-light/5 transition-all duration-200 flex items-center space-x-3 ${
                                currentSelectedSingleId === MYSTERY_SINGLE.id
                                    ? 'border-accent-teal-light bg-accent-teal-light/10'
                                    : 'border-gray-200'
                            }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                                <span className="text-lg font-bold text-gray-500">?</span>
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-semibold text-gray-900">
                                    {MYSTERY_SINGLE.name}
                                </div>
                            </div>
                            {currentSelectedSingleId === MYSTERY_SINGLE.id && (
                                <div className="text-accent-teal-light">✓</div>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
} 