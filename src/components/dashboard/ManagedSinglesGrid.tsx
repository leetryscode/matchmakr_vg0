'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SectionHeader from '@/components/ui/SectionHeader';
import ManagedSingleCard from './ManagedSingleCard';
import TemplateManagedSingleCard from './TemplateManagedSingleCard';

import { SingleStatus } from '@/lib/status/singleStatus';

interface ManagedSinglesGridProps {
    singles: Array<{
        id: string;
        name: string | null;
        sponsor_label: string | null;
        status: SingleStatus;
        approved_match_count: number;
    }>;
}

const ManagedSinglesGrid: React.FC<ManagedSinglesGridProps> = ({ singles }) => {
    const router = useRouter();
    const supabase = createClient();
    const [isInviteSingleModalOpen, setIsInviteSingleModalOpen] = useState(false);
    const [inviteSingleEmail, setInviteSingleEmail] = useState('');
    const [inviteSingleName, setInviteSingleName] = useState('');
    const [inviteError, setInviteError] = useState<string | null>(null);

    const handleCardClick = (singleId: string) => {
        router.push(`/profile/${singleId}`);
    };

    const openInviteModal = () => setIsInviteSingleModalOpen(true);

    return (
        <div>
            <SectionHeader 
                title="Managed Singles" 
                className="mt-10"
                right={
                    <button
                        onClick={openInviteModal}
                        className="type-meta bg-background-card hover:bg-background-card/90 rounded-lg px-3 py-1 transition-colors shadow-sm hover:shadow-md"
                    >
                        Invite
                    </button>
                }
            />
            
            {!singles || singles.length === 0 ? (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <TemplateManagedSingleCard onInviteClick={openInviteModal} />
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
            
            {/* Link Single Modal */}
            {/* NOTE: True invite-only onboarding will use an `invites` table to support pre-signup invites. */}
            {isInviteSingleModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
                        <h2 className="type-section mb-4 text-text-dark">Link a single account</h2>
                        <p className="text-text-light mb-2 leading-relaxed">
                            Link an existing Orbit account by email.
                        </p>
                        <p className="text-xs text-text-light mb-6">
                            They must already have an Orbit account.
                        </p>
                        <div className="space-y-4 mb-6">
                            <div>
                                <input
                                    type="text"
                                    value={inviteSingleName}
                                    onChange={(e) => {
                                        setInviteSingleName(e.target.value);
                                        setInviteError(null);
                                    }}
                                    placeholder="Name (only visible to you)"
                                    required
                                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                                />
                                <p className="text-xs text-text-light mt-1 text-left">
                                    This helps you keep track. They can change their name after joining.
                                </p>
                            </div>
                            <div>
                                <input
                                    type="email"
                                    value={inviteSingleEmail}
                                    onChange={(e) => {
                                        setInviteSingleEmail(e.target.value);
                                        setInviteError(null);
                                    }}
                                    placeholder="Single user's email address"
                                    required
                                    className="w-full border border-white/20 rounded-xl px-4 py-3 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                                />
                                {inviteError && (
                                    <p className="text-sm text-red-600 mt-2 text-left">
                                        {inviteError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => { 
                                setIsInviteSingleModalOpen(false); 
                                setInviteSingleEmail(''); 
                                setInviteSingleName('');
                                setInviteError(null);
                            }} className="px-6 py-3 bg-white/20 text-text-dark rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-button hover:shadow-button-hover">
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if (!inviteSingleName.trim()) {
                                        setInviteError('Please enter a name.');
                                        return;
                                    }
                                    if (!inviteSingleEmail.trim()) {
                                        setInviteError('Please enter an email address.');
                                        return;
                                    }
                                    
                                    setInviteError(null);
                                    
                                    try {
                                        const { data, error } = await supabase.functions.invoke('sponsor-single', {
                                            body: { 
                                                single_email: inviteSingleEmail,
                                                sponsor_label: inviteSingleName.trim()
                                            },
                                        });
                                        
                                        if (error) {
                                            // Supabase functions return error data in error.data when status is not 2xx
                                            // Our edge function returns { error: '...', code: '...' }
                                            const errorData = error.data;
                                            
                                            // Check if this is a USER_NOT_FOUND error
                                            if (errorData?.code === 'USER_NOT_FOUND') {
                                                setInviteError('Invites currently work only for people who already have an Orbit account. Email invitations are coming soon.');
                                                return;
                                            }
                                            
                                            // For other errors, show the error message from the function or generic message
                                            // Never show raw Supabase error messages
                                            const friendlyMessage = errorData?.error || 'An error occurred. Please try again.';
                                            setInviteError(friendlyMessage);
                                            return;
                                        }
                                        
                                        // Success - close modal and reload
                                        setIsInviteSingleModalOpen(false);
                                        setInviteSingleEmail('');
                                        setInviteSingleName('');
                                        setInviteError(null);
                                        window.location.reload();
                                    } catch (error: any) {
                                        // Catch any unexpected errors
                                        const errorData = error?.data;
                                        
                                        if (errorData?.code === 'USER_NOT_FOUND') {
                                            setInviteError('Invites currently work only for people who already have an Orbit account. Email invitations are coming soon.');
                                            return;
                                        }
                                        
                                        // Never show raw error messages
                                        setInviteError(errorData?.error || 'An error occurred. Please try again.');
                                    }
                                }} 
                                className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200"
                            >
                                Link account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagedSinglesGrid;

