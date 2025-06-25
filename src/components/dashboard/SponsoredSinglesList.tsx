'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import InviteSingle from './InviteSingle';
import Link from 'next/link';

interface SponsoredSingle {
    id: string;
    name: string | null;
    profile_pic_url: string | null;
}

interface SponsoredSinglesListProps {
    sponsoredSingles: SponsoredSingle[] | null;
}

// Modal for releasing a single
function ReleaseSingleModal({ single, onClose, onConfirm }: { single: SponsoredSingle | null; onClose: () => void; onConfirm: (singleId: string, singleName: string | null) => void; }) {
    if (!single) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-gray-200">
                <h2 className="font-inter font-bold text-2xl mb-4 text-primary-blue">Release {single.name || 'this Single'}?</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    You will no longer be able to manage their profile or find matches for them. This action cannot be undone, and they would need to invite you again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(single.id, single.name)} 
                        className="px-6 py-3 bg-gradient-coral text-white rounded-full font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1"
                    >
                        Yes, Release Single
                    </button>
                </div>
            </div>
        </div>
    );
}

function SponsoredSinglesList({ sponsoredSingles }: SponsoredSinglesListProps) {
    const supabase = createClient();
    const [releasingSingle, setReleasingSingle] = useState<SponsoredSingle | null>(null);

    const handleReleaseSingle = async (singleId: string, singleName: string | null) => {
        try {
            const { error } = await supabase.functions.invoke('end-sponsorship', {
                body: { single_id: singleId }
            });

            if (error) {
                throw new Error(error.message);
            }

            alert(`${singleName || 'Single'} released successfully.`);
            window.location.reload();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <>
            <div className="bg-background-card p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-primary-blue/10">
                <h2 className="font-inter font-bold text-3xl text-gray-800 mb-6">Manage Your Singles</h2>
                <div className="space-y-4">
                    {sponsoredSingles && sponsoredSingles.length > 0 ? (
                        sponsoredSingles.map(single => (
                            <div key={single.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-coral text-white font-bold text-xl shadow-avatar hover:shadow-avatar-hover transition-all duration-300 hover:-translate-y-1">
                                        {single.profile_pic_url ? (
                                            <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span>
                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-gray-800 text-lg">{single.name}</span>
                                </div>
                                <div className="flex gap-3">
                                    <Link href={`/profile/${single.id}`} className="px-4 py-2 bg-primary-blue text-white text-sm rounded-full font-semibold hover:bg-primary-blue-light transition-all duration-300 hover:-translate-y-1 shadow-button hover:shadow-button-hover">
                                        View
                                    </Link>
                                    <button 
                                        onClick={() => setReleasingSingle(single)}
                                        className="px-4 py-2 bg-accent-coral text-white text-sm rounded-full font-semibold hover:bg-red-600 transition-all duration-300 hover:-translate-y-1 shadow-button hover:shadow-button-hover"
                                    >
                                        Manage
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-12 bg-gradient-card rounded-2xl border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg mb-4">You are not sponsoring any singles yet.</p>
                            <p className="text-sm text-gray-400">Invite singles to start managing their profiles and finding matches for them!</p>
                        </div>
                    )}
                </div>
                <InviteSingle />
            </div>

            <ReleaseSingleModal
                single={releasingSingle}
                onClose={() => setReleasingSingle(null)}
                onConfirm={handleReleaseSingle}
            />
        </>
    );
}

export default SponsoredSinglesList; 