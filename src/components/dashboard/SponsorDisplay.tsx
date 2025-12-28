'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
            <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-gray-200">
                <h2 className="text-2xl font-light mb-4 text-primary-blue tracking-[0.05em] uppercase font-brand">END SPONSORSHIP WITH {sponsorName || 'YOUR SPONSOR'}?</h2>
                <p className="text-gray-600 mb-6">
                    They will no longer be able to manage your profile or find matches on your behalf. This action cannot be undone, and you would need to invite them again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-gradient-primary text-white rounded-md hover:bg-gradient-light font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
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

            alert('Sponsor removed successfully.');
            window.location.reload();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <>
            <div className="bg-background-card p-6 rounded-lg shadow-card mt-8 text-center border border-gray-200">
                <Link href={`/profile/${sponsor.id}`} className="group">
                    <h2 className="text-2xl font-light mb-4 group-hover:text-primary-blue transition-colors tracking-[0.05em] uppercase font-brand">YOUR SPONSOR</h2>
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary-blue group-hover:border-primary-blue-light transition-colors flex items-center justify-center bg-gray-200">
                        {sponsor.profile_pic_url ? (
                            <img src={sponsor.profile_pic_url} alt={sponsor.name || 'Sponsor'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-gray-500">
                                {sponsor.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-semibold text-gray-800 group-hover:text-primary-blue transition-colors">{sponsor.name}</p>
                </Link>
                <button className="mt-4 w-full bg-gradient-primary text-white py-3 rounded-lg hover:bg-gradient-light font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
                    Chat with your Sponsor
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-sm text-gray-500 hover:text-primary-blue hover:underline transition-colors"
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