'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import InviteSingle from './InviteSingle';
import Link from 'next/link';
import ChatModal from '@/components/chat/ChatModal';
import FlameUnreadIcon from './FlameUnreadIcon';

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
                        className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-1"
                    >
                        Yes, Release Single
                    </button>
                </div>
            </div>
        </div>
    );
}

function SponsoredSinglesList({ sponsoredSingles, singleChats, userId, userName, userProfilePic }: SponsoredSinglesListProps) {
    const supabase = createClient();
    const [releasingSingle, setReleasingSingle] = useState<SponsoredSingle | null>(null);
    const [openChatSingle, setOpenChatSingle] = useState<SponsoredSingle | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    useEffect(() => {
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
        fetchUnreadCounts();
    }, [sponsoredSingles, userId]);

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
            {/* Section header, no container */}
            <h2 className="font-inter font-bold text-xl text-white mb-2 border-b border-white/20 pb-1">Chat with your singles</h2>
            <div className="flex flex-col gap-3 mb-4">
                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                    sponsoredSingles.map(single => {
                        const lastMsg = singleChats && singleChats[single.id];
                        return (
                            <div
                                key={single.id}
                                className="flex items-center gap-4 py-3 pl-3 w-full bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-md transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                                role="button"
                                tabIndex={0}
                                onClick={() => setOpenChatSingle(single)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenChatSingle(single); } }}
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
            {/* Chat Modal for single */}
            {openChatSingle && (
                <ChatModal
                    open={!!openChatSingle}
                    onClose={() => setOpenChatSingle(null)}
                    currentUserId={userId}
                    currentUserName={userName}
                    currentUserProfilePic={userProfilePic}
                    otherUserId={openChatSingle.id}
                    otherUserName={openChatSingle.name || ''}
                    otherUserProfilePic={openChatSingle.profile_pic_url}
                    aboutSingle={{ id: openChatSingle.id, name: openChatSingle.name || '', photo: openChatSingle.profile_pic_url }}
                    clickedSingle={{ id: userId, name: userName, photo: userProfilePic }}
                />
            )}
        </>
    );
}

export default SponsoredSinglesList; 