import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';
import SponsorDisplay from '@/components/dashboard/SponsorDisplay';

// Placeholder components for the UI sections
const SinglesChat = () => (
    <div className="bg-background-card p-6 rounded-lg shadow-card border border-border-light">
        <h2 className="text-2xl font-bold mb-4 text-primary-blue">Singles Chat</h2>
        <p className="text-text-light">On MatchMakr, you don't get to choose your matches...</p>
        <div className="mt-4 p-4 border border-border-light rounded-lg bg-background-main">
             <p className="text-center text-text-light">You have no more chats with matches at this time. Remember, the goal is not to get a lot of matches... it's to get the right match!</p>
        </div>
    </div>
);

export default async function SingleDashboardPage() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch the user's full profile including sponsored_by_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || profile.user_type !== 'SINGLE') {
        redirect('/');
    }

    let sponsor = null;
    if (profile.sponsored_by_id) {
        const { data: sponsorProfile } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profile.sponsored_by_id)
            .single();
        
        // Use the first photo from photos array as profile picture
        if (sponsorProfile) {
            sponsor = {
                ...sponsorProfile,
                profile_pic_url: sponsorProfile.photos && sponsorProfile.photos.length > 0 ? sponsorProfile.photos[0] : null
            };
        }
    }
    
    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id} userType="SINGLE">
            <SinglesChat />
            {sponsor ? (
                <SponsorDisplay sponsor={sponsor} />
            ) : (
                <InviteMatchMakr />
            )}
        </DashboardLayout>
    );
} 