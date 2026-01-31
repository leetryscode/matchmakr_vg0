'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import FlameUnreadIcon from './FlameUnreadIcon';
import { useRouter, usePathname } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';

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
            <div className="flex flex-col gap-2.5">
                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                    sponsoredSingles.map(single => {
                        const lastMsg = latestMessages[single.id] || singleChats?.[single.id];
                        return (
                            <div
                                key={single.id}
                                className="flex items-center gap-4 py-3 px-4 w-full bg-background-card hover:bg-background-card/95 rounded-xl shadow-card hover:shadow-card-hover transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
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
                                        <span className="text-text-dark font-bold text-xl">{single.name?.charAt(0).toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="type-body block text-text-dark">{single.name}</span>
                                    {lastMsg && (
                                        <span className="type-meta block truncate max-w-xs text-text-light">{lastMsg.content}</span>
                                    )}
                                </div>
                                {lastMsg && (
                                    <span className="text-xs text-text-light whitespace-nowrap mr-2">{new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    <div className="text-text-dark mb-6 w-full text-center">No sponsored singles</div>
                )}
            </div>
        </>
    );
}

export default SponsoredSinglesList; 