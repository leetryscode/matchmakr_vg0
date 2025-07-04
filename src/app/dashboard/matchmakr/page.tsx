import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteSingle from '@/components/dashboard/InviteSingle';
import InviteOtherMatchMakrs from '@/components/dashboard/InviteOtherMatchMakrs';
import SponsoredSinglesList from '@/components/dashboard/SponsoredSinglesList';
import MatchMakrChatList from '@/components/dashboard/MatchMakrChatList';

// Prominent Singles Pond Button
const SinglesPondButton = () => (
    <div className="mb-8">
        <div className="bg-gradient-light p-8 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-accent-teal-light">
            <div className="text-center">
                <h2 className="font-inter font-bold text-3xl text-gray-800 mb-3">Singles Pond</h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    Discover and connect with singles looking for matches. Your matchmaking superpower awaits!
                </p>
                <a href="/pond" className="inline-block">
                    <button className="bg-gradient-primary text-white px-12 py-4 rounded-full font-semibold text-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-white">
                        Dive into the Pond
                    </button>
                </a>
            </div>
        </div>
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
    })) || [];

    const firstName = profile.name?.split(' ')[0] || null;

    // Fetch the current user's name and profile picture
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, photos')
        .eq('id', user.id)
        .single();
    const currentUserName = userProfile?.name || '';
    const currentUserProfilePic = userProfile?.photos && userProfile.photos.length > 0 ? userProfile.photos[0] : null;

    // Fetch all messages where user is sender or recipient (for singles)
    const { data: singleMessages } = processedSponsoredSingles.length > 0 ? await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.in.(${processedSponsoredSingles.map(s => s.id).join(',')}),recipient_id.in.(${processedSponsoredSingles.map(s => s.id).join(',')})`)
        .order('created_at', { ascending: false }) : { data: [] };

    // Map: singleId -> latest message
    const singleChats: Record<string, { content: string; created_at: string }> = {};
    if (singleMessages) {
        for (const msg of singleMessages) {
            // Find the single in this message
            const singleId = processedSponsoredSingles.find(s => s.id === msg.sender_id || s.id === msg.recipient_id)?.id;
            if (singleId && !singleChats[singleId]) {
                singleChats[singleId] = { content: msg.content, created_at: msg.created_at };
            }
        }
    }

    return (
        <DashboardLayout firstName={firstName} userId={user.id} userType="MATCHMAKR">
            <SinglesPondButton />
            <MatchMakrChatList userId={user.id} sponsoredSingles={processedSponsoredSingles || []} currentUserName={currentUserName} currentUserProfilePic={currentUserProfilePic} />
            <SponsoredSinglesList 
                sponsoredSingles={processedSponsoredSingles} 
                singleChats={singleChats} 
                userId={user.id}
                userName={currentUserName}
                userProfilePic={currentUserProfilePic}
            />
        </DashboardLayout>
    );
} 