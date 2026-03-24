"use client";
import React, { useState, useEffect } from 'react';
import SponsoredSinglesList from './SponsoredSinglesList';
import { useRealtimeMessages } from '@/contexts/RealtimeMessagesContext';

interface SponsoredSinglesListClientProps {
    sponsoredSingles: any[] | null;
    singleChats?: Record<string, { content: string; created_at: string }>;
    userId: string;
    userName: string;
    userProfilePic: string | null;
}

const SponsoredSinglesListClient: React.FC<SponsoredSinglesListClientProps> = ({
    sponsoredSingles: initialSponsoredSingles,
    singleChats: initialSingleChats,
    userId,
    userName,
    userProfilePic
}) => {
    const [sponsoredSingles, setSponsoredSingles] = useState(initialSponsoredSingles);
    const [liveSingleChats, setLiveSingleChats] = useState<Record<string, { content: string; created_at: string }>>(initialSingleChats ?? {});
    const { onDirectMessage } = useRealtimeMessages();

    // Update local state when props change (e.g. parent SSR re-render)
    useEffect(() => {
        setSponsoredSingles(initialSponsoredSingles);
    }, [initialSponsoredSingles]);

    useEffect(() => {
        setLiveSingleChats(initialSingleChats ?? {});
    }, [initialSingleChats]);

    // Subscribe to direct messages — update preview when a message involves a sponsored single
    useEffect(() => {
        const singles = sponsoredSingles;
        const unsubscribe = onDirectMessage((msg) => {
            if (!singles) return;
            const singleId = singles.find(
                (s) => s.id === msg.sender_id || s.id === msg.recipient_id
            )?.id;
            if (!singleId) return;
            setLiveSingleChats((prev) => ({
                ...prev,
                [singleId]: { content: msg.content, created_at: msg.created_at },
            }));
        });
        return unsubscribe;
    }, [onDirectMessage, sponsoredSingles]);

    const handleSponsorshipEnded = (singleId: string) => {
        // Remove the single from the local state
        if (sponsoredSingles) {
            const updatedSingles = sponsoredSingles.filter(single => single.id !== singleId);
            setSponsoredSingles(updatedSingles);
        }
    };

    return (
        <SponsoredSinglesList
            sponsoredSingles={sponsoredSingles}
            singleChats={liveSingleChats}
            userId={userId}
            userName={userName}
            userProfilePic={userProfilePic}
            onSponsorshipEnded={handleSponsorshipEnded}
        />
    );
};

export default SponsoredSinglesListClient;
