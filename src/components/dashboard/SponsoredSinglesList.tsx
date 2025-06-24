'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import InviteSingle from './InviteSingle';

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
            <div className="bg-white rounded-lg p-8 w-full max-w-md text-center shadow-xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Release {single.name || 'this Single'}?</h2>
                <p className="text-gray-600 mb-6">
                    You will no longer be able to manage their profile or find matches for them. This action cannot be undone, and they would need to invite you again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(single.id, single.name)} 
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
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
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h2 className="text-2xl font-bold mb-4">Manage Your Singles</h2>
                <div className="space-y-4">
                    {sponsoredSingles && sponsoredSingles.length > 0 ? (
                        sponsoredSingles.map(single => (
                            <div key={single.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200">
                                        {single.profile_pic_url ? (
                                            <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-gray-500">
                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-gray-800">{single.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">View</button>
                                    <button 
                                        onClick={() => setReleasingSingle(single)}
                                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                                    >
                                        Manage
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">You are not sponsoring any singles yet.</p>
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