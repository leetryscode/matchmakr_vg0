'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import InviteSingle from './InviteSingle';
import Link from 'next/link';
import FlameUnreadIcon from './FlameUnreadIcon';
import { useRouter, usePathname } from 'next/navigation';
import EndSponsorshipModal from './EndSponsorshipModal';

interface SponsoredSingle {
    id: string;
    name: string | null;
    profile_pic_url: string | null;
}

interface SponsoredSinglesListProps {
    sponsoredSingles: SponsoredSingle[] | null;
    singleChats?: Record<string, { content: string; created_at: string }>;
    userId: string;
    userName: string;
    userProfilePic: string | null;
    onSponsorshipEnded?: (singleId: string) => void;
}

// Modal for releasing a single
function ReleaseSingleModal({ single, onClose, onConfirm }: { single: SponsoredSingle | null; onClose: () => void; onConfirm: (singleId: string, singleName: string | null) => void; }) {
    if (!single) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-gray-200">
                <h2 className="text-2xl font-light mb-4 text-primary-blue tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>RELEASE {single.name || 'THIS SINGLE'}?</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    You will no longer be able to manage their profile or find matches for them. This action cannot be undone, and they would need to invite you again to reconnect.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300 shadow-button hover:shadow-button-hover">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(single.id, single.name)} 
                        className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1"
                    >
                        Yes, Release Single
                    </button>
                </div>
            </div>
        </div>
    );
}

function SponsoredSinglesList({ sponsoredSingles, singleChats, userId, userName, userProfilePic, onSponsorshipEnded }: SponsoredSinglesListProps) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [releasingSingle, setReleasingSingle] = useState<SponsoredSingle | null>(null);
    const [showEndSponsorshipModal, setShowEndSponsorshipModal] = useState(false);
    const [endingSponsorship, setEndingSponsorship] = useState(false);
    const [selectedSingleForEnd, setSelectedSingleForEnd] = useState<SponsoredSingle | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [latestMessages, setLatestMessages] = useState<Record<string, { content: string; created_at: string }>>({});

    const fetchUnreadCounts = async () => {
        if (!sponsoredSingles) return;
        const counts: Record<string, number> = {};
        for (const single of sponsoredSingles) {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', single.id)
                .eq('recipient_id', userId)
                .eq('read', false);
            counts[single.id] = count || 0;
        }
        setUnreadCounts(counts);
    };

    const fetchLatestMessages = async () => {
        if (!sponsoredSingles || sponsoredSingles.length === 0) return;
        
        const messages: Record<string, { content: string; created_at: string }> = {};
        
        for (const single of sponsoredSingles) {
            // Get the latest message for this single
            const { data: latestMessage } = await supabase
                .from('messages')
                .select('content, created_at')
                .or(`and(sender_id.eq.${single.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${single.id})`)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (latestMessage && latestMessage.length > 0) {
                messages[single.id] = {
                    content: latestMessage[0].content,
                    created_at: latestMessage[0].created_at
                };
            }
        }
        
        setLatestMessages(messages);
    };

    // Initial fetch
    useEffect(() => {
        fetchUnreadCounts();
        fetchLatestMessages();
    }, [sponsoredSingles, userId]);

    // Refresh when returning from single chat page
    useEffect(() => {
        // If we're on the dashboard page and just returned from a single chat page
        if (pathname === '/dashboard/matchmakr') {
            fetchUnreadCounts();
            fetchLatestMessages();
        }
    }, [pathname, userId, sponsoredSingles]);

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

    const handleEndSponsorship = async () => {
        if (!selectedSingleForEnd) return;
        
        setEndingSponsorship(true);
        try {
            const { error } = await supabase.functions.invoke('end-sponsorship', {
                body: { single_id: selectedSingleForEnd.id }
            });

            if (error) {
                throw new Error(error.message);
            }

            // Notify parent component to update the sponsored singles list
            if (onSponsorshipEnded) {
                onSponsorshipEnded(selectedSingleForEnd.id);
            }
        } catch (error: any) {
            console.error('Error ending sponsorship:', error);
            alert(`Error ending sponsorship: ${error.message}`);
        } finally {
            setEndingSponsorship(false);
            setSelectedSingleForEnd(null);
        }
    };

    return (
        <>
            {/* Section header, no container */}
                            <h2 className="text-xl font-light text-white mb-2 border-b border-white/20 pb-1 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>CHAT WITH YOUR SINGLES</h2>
            <div className="flex flex-col gap-3 mb-4">
                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                    sponsoredSingles.map(single => {
                        const lastMsg = latestMessages[single.id] || singleChats?.[single.id];
                        return (
                            <div
                                key={single.id}
                                className="flex items-center gap-4 py-3 pl-3 w-full bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-md transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                                role="button"
                                tabIndex={0}
                                onClick={e => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    router.push(`/dashboard/chat/single/${single.id}`);
                                }}
                                onKeyDown={e => { 
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    if (e.key === 'Enter' || e.key === ' ') { 
                                        e.preventDefault(); 
                                        router.push(`/dashboard/chat/single/${single.id}`); 
                                    } 
                                }}
                            >
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-primary text-white font-bold text-xl shadow-avatar overflow-hidden">
                                    {single.profile_pic_url ? (
                                        <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span>{single.name?.charAt(0).toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-white text-lg block">{single.name}</span>
                                    {lastMsg && (
                                        <span className="text-white/80 text-sm block truncate max-w-xs">{lastMsg.content}</span>
                                    )}
                                </div>
                                {lastMsg && (
                                    <span className="text-xs text-white/60 whitespace-nowrap mr-2">{new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                                {unreadCounts[single.id] > 0 && (
                                    <span className="ml-2 flex items-center">
                                        <FlameUnreadIcon count={unreadCounts[single.id]} />
                                    </span>
                                )}
                                {/* Three dots menu */}
                                <div className="relative menu-btn flex items-center justify-end ml-auto">
                                    <button
                                        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 focus:outline-none transition-colors"
                                        onClick={e => { 
                                            e.stopPropagation(); 
                                            setSelectedSingleForEnd(single);
                                            setShowEndSponsorshipModal(true); 
                                        }}
                                        tabIndex={-1}
                                        aria-label="Open menu"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                                            <circle cx="12" cy="5" r="2" fill="#fff"/>
                                            <circle cx="12" cy="12" r="2" fill="#fff"/>
                                            <circle cx="12" cy="19" r="2" fill="#fff"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-blue-100 mb-6 w-full text-center">You are not sponsoring any singles yet.</div>
                )}
            </div>
            <InviteSingle />
            <ReleaseSingleModal
                single={releasingSingle}
                onClose={() => setReleasingSingle(null)}
                onConfirm={handleReleaseSingle}
            />
            {/* End Sponsorship Modal */}
            <EndSponsorshipModal
                isOpen={showEndSponsorshipModal}
                onClose={() => setShowEndSponsorshipModal(false)}
                onConfirm={handleEndSponsorship}
                singleName={selectedSingleForEnd?.name || undefined}
                isSponsorView={true}
            />
        </>
    );
}

export default SponsoredSinglesList; 