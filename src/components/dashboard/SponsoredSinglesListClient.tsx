"use client";
import React, { useState, useEffect } from 'react';
import SponsoredSinglesList from './SponsoredSinglesList';

interface SponsoredSinglesListClientProps {
    sponsoredSingles: any[] | null;
    singleChats?: Record<string, { content: string; created_at: string }>;
    userId: string;
    userName: string;
    userProfilePic: string | null;
}

const SponsoredSinglesListClient: React.FC<SponsoredSinglesListClientProps> = ({ 
    sponsoredSingles: initialSponsoredSingles, 
    singleChats, 
    userId, 
    userName, 
    userProfilePic 
}) => {
    const [sponsoredSingles, setSponsoredSingles] = useState(initialSponsoredSingles);

    // Update local state when prop changes
    useEffect(() => {
        setSponsoredSingles(initialSponsoredSingles);
    }, [initialSponsoredSingles]);

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
            singleChats={singleChats}
            userId={userId}
            userName={userName}
            userProfilePic={userProfilePic}
            onSponsorshipEnded={handleSponsorshipEnded}
        />
    );
};

export default SponsoredSinglesListClient; 