'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import PreviewRow from '@/components/ui/PreviewRow';

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

function SponsoredSinglesList({ sponsoredSingles, singleChats, userId, userName, userProfilePic, onSponsorshipEnded }: SponsoredSinglesListProps) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
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

    return (
        <>
            {/* Section header */}
            <SectionHeader title="Chat with your singles" />
            <div className="mt-4 flex flex-col gap-4">
                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                    sponsoredSingles.map(single => {
                        const lastMsg = latestMessages[single.id] || singleChats?.[single.id];
                        return (
                            <div
                                key={single.id}
                                className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
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
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-background-card border-2 border-border-light overflow-hidden flex-shrink-0">
                                    {single.profile_pic_url ? (
                                        <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="text-orbit-text font-bold text-xl">{single.name?.charAt(0).toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="type-body block text-orbit-text">{single.name}</span>
                                    {lastMsg ? (
                                        <span className={`type-meta block truncate max-w-xs ${unreadCounts[single.id] > 0 ? 'font-semibold tracking-[0.01em] text-orbit-text' : 'text-orbit-muted'}`}>{lastMsg.content}</span>
                                    ) : null}
                                </div>
                                {/* Fixed metadata block: timestamp + inline unread dot. Unread is a state, not a badge. */}
                                <div className="w-[56px] flex items-center justify-end flex-shrink-0 ml-3">
                                    <span className="type-meta text-orbit-muted text-right whitespace-nowrap">{lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-orbit-gold ring-1 ring-orbit-surface1/50 ml-1.5 flex-shrink-0" style={{ opacity: unreadCounts[single.id] > 0 ? 1 : 0 }} aria-hidden />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <>
                        <p className="type-meta text-orbit-muted">
                            Conversations with singles you sponsor will appear here.
                        </p>
                        <div className="mt-2">
                            <PreviewRow title="Single Name" subtitle="Chat with your sponsored single" label="Preview" />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default SponsoredSinglesList; 