import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';
import SponsorDisplay from '@/components/dashboard/SponsorDisplay';

// Placeholder components for the UI sections
const SinglesChat = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Singles Chat</h2>
        <p className="text-gray-600">On MatchMakr, you don't get to choose your matches...</p>
        <div className="mt-4 p-4 border rounded-lg">
             <p className="text-center text-gray-500">You have no more chats with matches at this time. Remember, the goal is not to get a lot of matches... it's to get the right match!</p>
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
            .select('id, name, profile_pic_url')
            .eq('id', profile.sponsored_by_id)
            .single();
        sponsor = sponsorProfile;
    }
    
    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id}>
            <SinglesChat />
            {sponsor ? (
                <SponsorDisplay sponsor={sponsor} />
            ) : (
                <InviteMatchMakr />
            )}
        </DashboardLayout>
    );
} 