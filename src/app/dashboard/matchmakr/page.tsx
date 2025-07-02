import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteSingle from '@/components/dashboard/InviteSingle';
import InviteOtherMatchMakrs from '@/components/dashboard/InviteOtherMatchMakrs';
import SponsoredSinglesList from '@/components/dashboard/SponsoredSinglesList';

// Prominent Singles Pond Button
const SinglesPondButton = () => (
    <div className="mb-8">
        <div className="bg-gradient-light p-8 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-accent-teal-light">
            <div className="text-center">
                <h2 className="font-inter font-bold text-3xl text-gray-800 mb-3">Singles Pond</h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    Discover and connect with singles looking for matches. Your matchmaking superpower awaits!
                </p>
                <button className="bg-gradient-primary text-white px-12 py-4 rounded-full font-semibold text-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-white">
                    Dive into the Pond
                </button>
            </div>
        </div>
    </div>
);

// Modern Chat Section
const MatchMakrChatList = () => (
    <div className="bg-background-card p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-primary-blue/10 mb-8">
        <h2 className="font-inter font-bold text-3xl text-gray-800 mb-3">MatchMakr Chat</h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-6">Chat windows with other MatchMakrs like you, on behalf of their sponsored singles =)</p>
        
        <div className="text-center p-12 bg-gradient-card rounded-2xl border-2 border-dashed border-gray-300 mb-6">
            <p className="text-gray-500 text-lg">You have no more chats with MatchMakrs.</p>
        </div>
        
        <button className="w-full bg-gradient-primary text-white py-4 px-8 rounded-full font-semibold text-lg shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2">
            Invite a MatchMakr!
        </button>
    </div>
);

const ManageSinglesList = () => (
     <div className="bg-background-card p-6 rounded-lg shadow-card mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-primary-blue">Manage Singles</h2>
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
             <p className="text-center text-gray-500">Chats with the singles you manage.</p>
        </div>
        <button className="mt-4 w-full bg-gradient-light text-white py-3 rounded-lg hover:bg-gradient-primary font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
            Invite a Single!
        </button>
    </div>
);

export default async function MatchMakrDashboardPage() {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, user_type')
        .eq('id', user.id)
        .single();

    if (!profile || profile.user_type !== 'MATCHMAKR') {
        // Redirect if not a matchmakr, or no profile found
        redirect('/');
    }
    
    // Fetch the list of singles sponsored by this MatchMakr
    const { data: sponsoredSingles } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('sponsored_by_id', user.id)
        .eq('user_type', 'SINGLE');

    // Use the first photo from photos array as profile picture
    const processedSponsoredSingles = sponsoredSingles?.map(single => ({
        ...single,
        profile_pic_url: single.photos && single.photos.length > 0 ? single.photos[0] : null
    })) || null;

    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id}>
            <SinglesPondButton />
            <InviteOtherMatchMakrs />
            <SponsoredSinglesList sponsoredSingles={processedSponsoredSingles} />
        </DashboardLayout>
    );
} 