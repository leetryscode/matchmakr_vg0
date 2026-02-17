import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import React from 'react';
import SponsoredSinglesListClient from '@/components/dashboard/SponsoredSinglesListClient';
import MatchMakrChatList from '@/components/dashboard/MatchMakrChatList';
import OrbitCarouselHeader from '@/components/dashboard/OrbitCarouselHeader';
import NotificationsSection from '@/components/dashboard/NotificationsSection';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import ManagedSinglesGrid from '@/components/dashboard/ManagedSinglesGrid';
import SneakPeeksSection from '@/components/dashboard/SneakPeeksSection';
import SponsorshipRequestsSection from '@/components/dashboard/SponsorshipRequestsSection';
import Link from 'next/link';
import { createSponsorLoginNotifications } from '@/lib/notifications/sponsor-login';
import { checkAndCreateSingleNotSeenIntroNotifications } from '@/lib/notifications/single-not-seen-intro';
import { computeSingleStatus, type SingleStatus } from '@/lib/status/singleStatus';
import { getInviteDisplayStatus } from '@/lib/invites/status';

// Placeholder orbit satellites when sponsor has no managed singles (visual preview only)
const PREVIEW_ORBIT_SATELLITES = [
    { id: 'orbit-preview-1', name: '', avatarUrl: null as string | null, isPreview: true },
    { id: 'orbit-preview-2', name: '', avatarUrl: null as string | null, isPreview: true },
    { id: 'orbit-preview-3', name: '', avatarUrl: null as string | null, isPreview: true },
];

// Introductions destination card - WHOOP-style navigation card
const IntroductionsCard = () => (
    <Link 
        href="/pond"
        className="block w-full bg-background-card hover:bg-background-card/90 rounded-card-lg shadow-card hover:shadow-card-hover hover:-translate-y-[1px] active:translate-y-0 active:shadow-card transition-all duration-200 p-6 group cursor-pointer"
    >
        <div className="flex items-start justify-between">
            <div className="flex flex-col flex-1">
                <h3 className="type-section mb-1 text-text-dark">Introductions</h3>
                <p className="type-meta text-text-light">View singles and message their sponsor</p>
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
                className="text-text-dark group-hover:text-white/90 transition-colors flex-shrink-0 ml-4"
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
        <button className="mt-4 w-full rounded-cta min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 py-3">
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

    // Fetch invites created by this sponsor
    const { data: invites } = await supabase
        .from('invites')
        .select('id, invitee_email, invitee_phone_e164, invitee_user_id, status, created_at, claimed_at')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch sponsorship_requests for those invites
    const inviteIds = (invites ?? []).map((i: { id: string }) => i.id);
    const { data: requests } = inviteIds.length > 0
        ? await supabase
            .from('sponsorship_requests')
            .select('id, invite_id, single_id, sponsor_id, status, created_at, updated_at')
            .in('invite_id', inviteIds)
        : { data: [] };

    const requestByInviteId: Record<string, { id: string; single_id: string; status: string }> = {};
    (requests ?? []).forEach((r: { invite_id: string; id: string; single_id: string; status: string }) => {
        if (r.invite_id) requestByInviteId[r.invite_id] = { id: r.id, single_id: r.single_id, status: r.status };
    });

    // Fetch sponsorship requests where single invited this sponsor (PENDING_SPONSOR_APPROVAL)
    const { data: pendingSponsorRequests } = await supabase
        .from('sponsorship_requests')
        .select('id, single_id, status, invite_id, created_at')
        .eq('sponsor_id', user.id)
        .eq('status', 'PENDING_SPONSOR_APPROVAL')
        .order('created_at', { ascending: false });

    const pendingSponsorSingleIds = [...new Set((pendingSponsorRequests ?? []).map((r: { single_id: string }) => r.single_id))];
    const { data: pendingSponsorSingles } = pendingSponsorSingleIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, name')
            .in('id', pendingSponsorSingleIds)
        : { data: [] };

    const pendingSponsorSingleNameMap: Record<string, string> = {};
    (pendingSponsorSingles ?? []).forEach((s: { id: string; name: string | null }) => {
        pendingSponsorSingleNameMap[s.id] = s.name || 'Someone';
    });

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

    const realSingleIds = new Set(processedSponsoredSingles.map((s: { id: string }) => s.id));

    // Build invite rows (exclude invites that are already real sponsored singles).
    // When single accepts, profiles.sponsored_by_id is set → they appear in sponsoredSingles →
    // invitee_user_id is filtered out → accepted invite row disappears. Sponsor sees update on next page load.
    // Status: prefer request.status when request exists; otherwise use invite.status
    const inviteRows = (invites ?? [])
        .filter((inv: { invitee_user_id: string | null }) => !inv.invitee_user_id || !realSingleIds.has(inv.invitee_user_id))
        .map((inv: { id: string; invitee_email: string | null; invitee_phone_e164?: string | null; invitee_user_id: string | null; status: string; created_at: string }) => {
            const req = requestByInviteId[inv.id];
            const { displayStatus, subtext: declineSubtext, isClickable } = getInviteDisplayStatus(
                inv.status,
                req?.status,
                inv.invitee_user_id
            );
            return {
                type: 'invite' as const,
                id: inv.id,
                invitee_email: inv.invitee_email ?? '',
                invitee_phone_e164: inv.invitee_phone_e164 ?? null,
                invitee_user_id: inv.invitee_user_id,
                status: displayStatus,
                profile_id: inv.invitee_user_id,
                created_at: inv.created_at,
                decline_subtext: declineSubtext,
                is_clickable: isClickable,
            };
        });

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
            
            {/* Orbit Carousel Header - full-bleed on mobile, clip horizontal overflow */}
            <div className="mt-1 min-h-0 -mx-4 sm:-mx-6 md:-mx-8" style={{ overflowX: 'clip' }}>
                <OrbitCarouselHeader
                centerUser={{
                    id: user.id,
                    name: currentUserName,
                    avatarUrl: currentUserProfilePic,
                }}
                satellites={
                    processedSponsoredSingles.length === 0
                        ? PREVIEW_ORBIT_SATELLITES
                        : processedSponsoredSingles.map(single => ({
                              id: single.id,
                              name: single.name || '',
                              avatarUrl: single.profile_pic_url,
                          }))
                }
                />
            </div>
            
            {/* Consistent vertical rhythm between sections */}
            <div className="flex flex-col">
                {/* Notifications */}
                <section className="mt-10 first:mt-0">
                    <NotificationsSection userId={user.id} />
                </section>

                {/* Sponsorship requests (singles who invited this sponsor) */}
                <SponsorshipRequestsSection
                    requests={pendingSponsorRequests ?? []}
                    singleNameMap={pendingSponsorSingleNameMap}
                />

                {/* Sponsor chat */}
                <section className="mt-10">
                    <MatchMakrChatList userId={user.id} sponsoredSingles={processedSponsoredSingles || []} currentUserName={currentUserName} currentUserProfilePic={currentUserProfilePic} />
                </section>

                {/* Managed Singles */}
                <section className="mt-10">
                    <ManagedSinglesGrid singles={processedSponsoredSingles} inviteRows={inviteRows} userId={user.id} />
                </section>

                {/* Chat with your singles */}
                <section className="mt-10">
                    <SponsoredSinglesListClient 
                        sponsoredSingles={processedSponsoredSingles} 
                        singleChats={singleChats} 
                        userId={user.id}
                        userName={currentUserName}
                        userProfilePic={currentUserProfilePic}
                    />
                </section>

                {/* Sneak peaks sent to my singles */}
                <section className="mt-10">
                    <SneakPeeksSection 
                        sponsorId={user.id}
                        sponsoredSingles={processedSponsoredSingles}
                    />
                </section>

                {/* Introductions destination card */}
                <section className="mt-10">
                    <IntroductionsCard />
                </section>
                
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