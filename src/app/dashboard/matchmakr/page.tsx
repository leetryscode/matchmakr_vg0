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
import OrbitCarouselHeader from '@/components/dashboard/OrbitCarouselHeader';
import NotificationsSection from '@/components/dashboard/NotificationsSection';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import ManagedSinglesGrid from '@/components/dashboard/ManagedSinglesGrid';
import SneakPeeksSection from '@/components/dashboard/SneakPeeksSection';
import Link from 'next/link';
import { createSponsorLoginNotifications } from '@/lib/notifications/sponsor-login';
import { checkAndCreateSingleNotSeenIntroNotifications } from '@/lib/notifications/single-not-seen-intro';
import { computeSingleStatus, type SingleStatus } from '@/lib/status/singleStatus';

// Introductions destination card - WHOOP-style navigation card
const IntroductionsCard = () => (
    <Link 
        href="/pond"
        className="block w-full bg-white/5 hover:bg-white/10 rounded-card-lg border border-white/10 hover:border-white/20 shadow-card hover:shadow-card-hover transition-all duration-200 p-6 group cursor-pointer"
    >
        <div className="flex items-start justify-between">
            <div className="flex flex-col flex-1">
                <h3 className="type-section mb-1">Introductions</h3>
                <p className="type-meta">View singles and message their sponsor</p>
            </div>
            {/* Right-facing chevron in top right */}
            <svg 
                width="24" 
                height="24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                viewBox="0 0 24 24"
                className="text-white group-hover:text-white/90 transition-colors flex-shrink-0 ml-4"
            >
                <polyline points="9,18 15,12 9,6" />
            </svg>
        </div>
    </Link>
);

const ManageSinglesList = () => (
     <div className="bg-background-card p-6 rounded-lg shadow-card mt-8 border border-gray-200">
        <h2 className="type-section mb-4 text-primary-blue">Manage Singles</h2>
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
             <p className="text-center type-meta">Chats with the singles you manage.</p>
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

    // Trigger notifications for sponsored singles (non-blocking)
    // This runs asynchronously and won't delay dashboard load
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
        // Fire and forget - don't await
        // 1. Sponsor-login notifications
        createSponsorLoginNotifications(user.id, supabaseUrl, serviceRoleKey).catch((error) => {
            // Error already logged in the function, just ensure it doesn't crash
            console.error('[MatchMakrDashboard] Failed to create sponsor-login notifications:', error);
        });
        
        // 2. Single-not-seen-intro notifications (opportunistic check)
        checkAndCreateSingleNotSeenIntroNotifications(user.id, supabaseUrl, serviceRoleKey).catch((error) => {
            // Error already logged in the function, just ensure it doesn't crash
            console.error('[MatchMakrDashboard] Failed to check single-not-seen-intro notifications:', error);
        });
    }
    
    // Fetch the list of singles sponsored by this MatchMakr
    // Ordered by created_at ascending so satellites appear in the order they were added
    // Include fields needed for status computation
    const { data: sponsoredSingles } = await supabase
        .from('profiles')
        .select('id, name, photos, created_at, onboarded_at, matchmakr_endorsement, sponsor_label, paused_at')
        .eq('sponsored_by_id', user.id)
        .eq('user_type', 'SINGLE')
        .order('created_at', { ascending: true });

    // Fetch approved match counts for all sponsored singles (efficient two-query approach)
    // Approved match = match where approved_at IS NOT NULL (both matchmakrs approved)
    const singleIds = sponsoredSingles?.map(s => s.id) || [];
    let approvedMatchCounts: Record<string, number> = {};
    
    if (singleIds.length > 0) {
        // Initialize counts to 0 for all singles
        singleIds.forEach(id => {
            approvedMatchCounts[id] = 0;
        });
        
        // Query 1: Matches where single_a_id is in our list
        const { data: matchesAsA, error: errorA } = await supabase
            .from('matches')
            .select('single_a_id, single_b_id')
            .not('approved_at', 'is', null)
            .in('single_a_id', singleIds);
        
        if (errorA) {
            console.error('[MatchMakrDashboard] Error fetching matchesAsA:', errorA);
        }
        
        // Query 2: Matches where single_b_id is in our list
        const { data: matchesAsB, error: errorB } = await supabase
            .from('matches')
            .select('single_a_id, single_b_id')
            .not('approved_at', 'is', null)
            .in('single_b_id', singleIds);
        
        if (errorB) {
            console.error('[MatchMakrDashboard] Error fetching matchesAsB:', errorB);
        }
        
        // Count matches for singles in single_a_id position
        // No need to check singleIds.includes() since we already filtered with .in()
        matchesAsA?.forEach(match => {
            approvedMatchCounts[match.single_a_id]++;
        });
        
        // Count matches for singles in single_b_id position
        // No need to check singleIds.includes() since we already filtered with .in()
        matchesAsB?.forEach(match => {
            approvedMatchCounts[match.single_b_id]++;
        });
    }

    // Use the first photo from photos array as profile picture
    // Include status-related fields and compute status
    const processedSponsoredSingles = sponsoredSingles?.map(single => {
        const approvedMatchCount = approvedMatchCounts[single.id] || 0;
        const status = computeSingleStatus({
            paused_at: single.paused_at,
            onboarded_at: single.onboarded_at,
            photos: single.photos,
            matchmakr_endorsement: single.matchmakr_endorsement,
            approved_match_count: approvedMatchCount
        });
        
        return {
            ...single,
            profile_pic_url: single.photos && single.photos.length > 0 ? single.photos[0] : null,
            approved_match_count: approvedMatchCount,
            status,
            sponsor_label: single.sponsor_label
        };
    }) || [];

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
            <div className="pt-0 px-4">
                <div className="type-display mb-1">Hello, {firstName}</div>
            </div>
            
            {/* Orbit Carousel Header */}
            <div className="mt-1">
                <OrbitCarouselHeader
                centerUser={{
                    id: user.id,
                    name: currentUserName,
                    avatarUrl: currentUserProfilePic,
                }}
                satellites={processedSponsoredSingles.map(single => ({
                    id: single.id,
                    name: single.name || '',
                    avatarUrl: single.profile_pic_url,
                }))}
                />
            </div>
            
            {/* Consistent vertical rhythm between sections */}
            <div className="flex flex-col space-y-8">
                {/* Notifications */}
                <NotificationsSection userId={user.id} />

                {/* Sponsor chat */}
                <div>
                    <MatchMakrChatList userId={user.id} sponsoredSingles={processedSponsoredSingles || []} currentUserName={currentUserName} currentUserProfilePic={currentUserProfilePic} />
                </div>

                {/* Managed Singles */}
                <ManagedSinglesGrid singles={processedSponsoredSingles} />

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

                {/* Sneak peaks sent to my singles */}
                <SneakPeeksSection 
                    sponsorId={user.id}
                    sponsoredSingles={processedSponsoredSingles}
                />

                {/* Introductions destination card */}
                <IntroductionsCard />
                
                {/* Footer spacer with brand mark */}
                <DashboardFooterSpacer />
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