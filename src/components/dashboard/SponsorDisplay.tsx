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
            <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-white/20">
                <h2 className="text-2xl font-light mb-4 text-text-dark tracking-[0.05em] uppercase font-brand">END SPONSORSHIP WITH {sponsorName || 'YOUR SPONSOR'}?</h2>
                <p className="text-text-light mb-6">
                    They will no longer be able to manage your profile or find matches on your behalf. This action cannot be undone, and you would need to invite them again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-white/20 text-text-dark rounded-md hover:bg-white/30 font-semibold transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="rounded-cta px-6 py-2 min-h-[44px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200">
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
            <div className="bg-background-card p-6 rounded-lg shadow-card mt-8 text-center border border-white/20">
                <Link href={`/profile/${sponsor.id}`} className="group">
                    <h2 className="text-2xl font-light mb-4 group-hover:text-white transition-colors tracking-[0.05em] uppercase font-brand text-text-dark">YOUR SPONSOR</h2>
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/30 group-hover:border-white/50 transition-colors flex items-center justify-center bg-white/10">
                        {sponsor.profile_pic_url ? (
                            <img src={sponsor.profile_pic_url} alt={sponsor.name || 'Sponsor'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-text-light">
                                {sponsor.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-semibold text-text-dark group-hover:text-white transition-colors">{sponsor.name}</p>
                </Link>
                <button className="mt-4 w-full rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 py-3">
                    Chat with your Sponsor
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-sm text-text-light hover:text-white hover:underline transition-colors"
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