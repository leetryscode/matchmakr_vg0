'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SponsorDisplayProps {
    sponsor: {
        id: string;
        name: string | null;
        profile_pic_url: string | null;
    };
}

// A new modal component defined within the same file for co-location
function EndSponsorshipModal({ isOpen, onClose, onConfirm, sponsorName }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; sponsorName: string | null }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md text-center shadow-xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">End Sponsorship with {sponsorName || 'your MatchMakr'}?</h2>
                <p className="text-gray-600 mb-6">
                    They will no longer be able to manage your profile or find matches on your behalf. This action cannot be undone, and you would need to invite them again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">
                        Yes, End Sponsorship
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SponsorDisplay({ sponsor }: SponsorDisplayProps) {
    const supabase = createClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRemoveSponsor = async () => {
        try {
            const { error } = await supabase.functions.invoke('end-sponsorship');

            if (error) {
                throw new Error(error.message);
            }

            alert('MatchMakr removed successfully.');
            window.location.reload();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md mt-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Your MatchMakr</h2>
                <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-pink-300 flex items-center justify-center bg-gray-200">
                    {sponsor.profile_pic_url ? (
                        <img src={sponsor.profile_pic_url} alt={sponsor.name || 'Sponsor'} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold text-gray-500">
                            {sponsor.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                    )}
                </div>
                <p className="text-xl font-semibold text-gray-800">{sponsor.name}</p>
                <button className="mt-4 w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold">
                    Chat with your MatchMakr
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-sm text-gray-500 hover:text-red-600 hover:underline"
                >
                    End sponsorship
                </button>
            </div>

            <EndSponsorshipModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleRemoveSponsor}
                sponsorName={sponsor.name}
            />
        </>
    );
} 