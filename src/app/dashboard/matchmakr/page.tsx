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
import OrbitControlPlaceholder from '@/components/dashboard/OrbitControlPlaceholder';
import GlassCard from '@/components/ui/GlassCard';
import PrimaryCTA from '@/components/ui/PrimaryCTA';
import SectionHeader from '@/components/ui/SectionHeader';

// Prominent Singles Pond Button - Primary CTA section
const SinglesPondButton = () => (
    <GlassCard variant="2" className="p-8">
        <div className="text-center">
            <PrimaryCTA href="/pond">
                Singles Pond
            </PrimaryCTA>
            <div className="mt-4 text-white text-base font-medium">Discover singles, message their sponsor</div>
        </div>
    </GlassCard>
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
            {/* Greeting */}
            <div className="pt-0 pb-2 px-4">
                <div className="type-display mb-1">Hello, {firstName}</div>
            </div>
            
            {/* Orbit Control Placeholder */}
            <OrbitControlPlaceholder
                userId={user.id}
                userName={currentUserName}
                userProfilePic={currentUserProfilePic}
                sponsoredSingles={processedSponsoredSingles}
            />
            
            {/* Consistent vertical rhythm between sections */}
            <div className="flex flex-col space-y-6">

                {/* Shared panel: Notifications, Sponsor chat, Chat with your singles */}
                <GlassCard variant="1" className="p-6">
                    <div className="flex flex-col space-y-6">
                        {/* Notifications */}
                        <div>
                            <SectionHeader title="Notifications" />
                            <div className="text-center py-4">
                                <p className="type-meta">No notifications yet.</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/20"></div>

                        {/* Sponsor chat */}
                        <div>
                            <MatchMakrChatList userId={user.id} sponsoredSingles={processedSponsoredSingles || []} currentUserName={currentUserName} currentUserProfilePic={currentUserProfilePic} />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/20"></div>

                        {/* Chat with your singles */}
                        <div>
                            <SponsoredSinglesListClient 
                                sponsoredSingles={processedSponsoredSingles} 
                                singleChats={singleChats} 
                                userId={user.id}
                                userName={currentUserName}
                                userProfilePic={currentUserProfilePic}
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Primary CTA - Singles Pond (hero card) */}
                <SinglesPondButton />
            </div>
            
            {/* Settings Button - positioned normally in page flow, bottom right */}
            <div className="w-full flex justify-end mt-8 mb-4 pr-4">
                <a 
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="Settings"
                >
                    {/* Settings Gear SVG */}
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                </a>
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