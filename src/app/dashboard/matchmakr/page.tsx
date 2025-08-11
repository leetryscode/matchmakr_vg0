import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import React from 'react';
import InviteSingle from '@/components/dashboard/InviteSingle';
import InviteOtherMatchMakrs from '@/components/dashboard/InviteOtherMatchMakrs';
import SponsoredSinglesListClient from '@/components/dashboard/SponsoredSinglesListClient';
import MatchMakrChatList from '@/components/dashboard/MatchMakrChatList';
import AddSingleButton from '@/components/dashboard/AddSingleButton';

// Prominent Singles Pond Button
const SinglesPondButton = () => (
    <div className="mb-8">
        <div className="bg-white/10 p-8 rounded-xl shadow-card border border-white/20">
            <div className="text-center">
                <a href="/pond" className="inline-block">
                    <button className="bg-gradient-to-br from-primary-blue to-primary-teal text-white px-12 py-4 rounded-full font-semibold text-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-white">
                        Singles Pond
                    </button>
                </a>
                <div className="mt-4 text-white text-base font-medium">Discover singles, message their sponsor</div>
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
            Invite a Sponsor!
        </button>
    </div>
);

// Server component to fetch initial data
async function MatchMakrDashboardContent() {
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

    const firstName = profile.name?.split(' ')[0] || profile.name || 'User';

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
            <div className="pt-0 pb-2 px-4">
                <div className="text-2xl text-white font-extrabold mb-1 tracking-tight drop-shadow-sm">Hello, {firstName}</div>
            </div>
            <SinglesPondButton />
            <MatchMakrChatList userId={user.id} sponsoredSingles={processedSponsoredSingles || []} currentUserName={currentUserName} currentUserProfilePic={currentUserProfilePic} />
            <SponsoredSinglesListClient 
                sponsoredSingles={processedSponsoredSingles} 
                singleChats={singleChats} 
                userId={user.id}
                userName={currentUserName}
                userProfilePic={currentUserProfilePic}
            />
            {/* Manage my Singles Section */}
            <div className="mt-10 flex flex-col items-center mb-32">
                <h2 className="font-inter font-bold text-xl text-white mb-4 border-b border-white/20 pb-1 w-full text-center">Manage my Singles</h2>
                <a href={`/profile/${user.id}`} className="block mb-2">
                    <div className="w-28 h-28 rounded-full border-4 border-white bg-gray-200 overflow-hidden flex items-center justify-center mx-auto shadow-lg hover:scale-105 transition">
                        {currentUserProfilePic ? (
                            <img src={currentUserProfilePic} alt={currentUserName} className="object-cover w-full h-full" />
                        ) : (
                            <span className="text-4xl font-bold text-white">{currentUserName?.charAt(0).toUpperCase() || '?'}</span>
                        )}
                    </div>
                </a>
                <a href={`/profile/${user.id}`} className="text-base text-white hover:text-accent-teal-light focus:outline-none mb-6 block text-center">My Profile</a>
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-6 w-full max-w-xs">
                    {processedSponsoredSingles && processedSponsoredSingles.length > 0 ? (
                        processedSponsoredSingles.map(single => (
                            <a key={single.id} href={`/profile/${single.id}`} className="flex flex-col items-center group w-20">
                                <div className="w-16 h-16 rounded-full border-2 border-white bg-gray-200 overflow-hidden flex items-center justify-center shadow-md group-hover:scale-105 transition">
                                    {single.profile_pic_url ? (
                                        <img src={single.profile_pic_url} alt={single.name || 'Single'} className="object-cover w-full h-full" />
                                    ) : (
                                        <span className="text-2xl font-bold text-white">{single.name?.charAt(0).toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <span className="mt-2 text-sm font-semibold text-white text-center w-full">{single.name}</span>
                            </a>
                        ))
                    ) : (
                        <AddSingleButton />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

// Client wrapper component
export default function MatchMakrDashboardPage() {
    return (
        <DashboardWrapper expectedUserType="MATCHMAKR">
            <MatchMakrDashboardContent />
        </DashboardWrapper>
    );
} 