'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SectionHeader from '@/components/ui/SectionHeader';
import ManagedSingleCard from './ManagedSingleCard';

import { SingleStatus } from '@/lib/status/singleStatus';

interface ManagedSinglesGridProps {
    singles: Array<{
        id: string;
        name: string | null;
        status: SingleStatus;
        approved_match_count: number;
    }>;
}

const ManagedSinglesGrid: React.FC<ManagedSinglesGridProps> = ({ singles }) => {
    const router = useRouter();
    const supabase = createClient();
    const [isInviteSingleModalOpen, setIsInviteSingleModalOpen] = useState(false);
    const [inviteSingleEmail, setInviteSingleEmail] = useState('');

    const handleCardClick = (singleId: string) => {
        router.push(`/profile/${singleId}`);
    };

    return (
        <div>
            <SectionHeader 
                title="Managed Singles" 
                className="mt-10"
                right={
                    <button
                        onClick={() => setIsInviteSingleModalOpen(true)}
                        className="type-meta text-white/70 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1 transition-colors"
                    >
                        Invite
                    </button>
                }
            />
            
            {!singles || singles.length === 0 ? (
                <div className="bg-white/5 rounded-card-lg border border-white/10 p-6 text-center mt-2">
                    <p className="type-meta text-white/70">No managed singles yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {singles.map((single) => (
                        <ManagedSingleCard
                            key={single.id}
                            single={single}
                            status={single.status}
                            approvedMatchCount={single.approved_match_count}
                            onClick={() => handleCardClick(single.id)}
                        />
                    ))}
                </div>
            )}
            
            {/* Invite Single Modal */}
            {isInviteSingleModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-gray-200">
                        <h2 className="type-section mb-4 text-primary-blue">Invite a single user</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Invite a single user to find matches for.
                        </p>
                        <input
                            type="email"
                            value={inviteSingleEmail}
                            onChange={(e) => setInviteSingleEmail(e.target.value)}
                            placeholder="Single user's email address"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                        />
                        <div className="flex justify-end gap-4">
                            <button onClick={() => { setIsInviteSingleModalOpen(false); setInviteSingleEmail(''); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover">
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    try {
                                        const { data, error } = await supabase.functions.invoke('sponsor-single', {
                                            body: { single_email: inviteSingleEmail },
                                        });
                                        if (error) throw error;
                                        setIsInviteSingleModalOpen(false);
                                        setInviteSingleEmail('');
                                        window.location.reload();
                                    } catch (error: any) {
                                        alert(error.message || 'An error occurred.');
                                    }
                                }} 
                                className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1"
                            >
                                Send invite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagedSinglesGrid;

