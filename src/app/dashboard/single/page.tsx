import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';

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
    const cookieStore = cookies();
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
                <div className="bg-white p-6 rounded-lg shadow-md mt-8 text-center">
                    <h2 className="text-2xl font-bold mb-4">Your MatchMakr</h2>
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-pink-300 flex items-center justify-center bg-gray-200">
                        {sponsor.profile_pic_url ? (
                            <img src={sponsor.profile_pic_url} alt={sponsor.name || 'Sponsor'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-gray-500">
                                {sponsor.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-semibold text-gray-800">{sponsor.name}</p>
                    <button className="mt-4 w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold">
                        Chat with your MatchMakr
                    </button>
                </div>
            ) : (
                <InviteMatchMakr />
            )}
        </DashboardLayout>
    );
} 