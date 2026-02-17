import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import React, { useState } from 'react';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';
import ChatModal from '@/components/chat/ChatModal';
import SingleDashboardClient from '@/components/dashboard/SingleDashboardClient';

// Server component to fetch initial data
async function SingleDashboardContent() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch the user's full profile including status-related fields
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

    // Fetch approved match count for status computation
    let approvedMatchCount = 0;
    const { data: matchesAsA } = await supabase
        .from('matches')
        .select('id')
        .not('approved_at', 'is', null)
        .eq('single_a_id', user.id);
    
    const { data: matchesAsB } = await supabase
        .from('matches')
        .select('id')
        .not('approved_at', 'is', null)
        .eq('single_b_id', user.id);
    
    approvedMatchCount = (matchesAsA?.length || 0) + (matchesAsB?.length || 0);

    // Fetch pending sponsorship requests for this single
    const { data: pendingRequests } = await supabase
        .from('sponsorship_requests')
        .select('id, sponsor_id, status, invite_id, created_at')
        .eq('single_id', user.id)
        .eq('status', 'PENDING_SINGLE_APPROVAL')
        .order('created_at', { ascending: false });

    const sponsorIds = [...new Set((pendingRequests ?? []).map((r: { sponsor_id: string }) => r.sponsor_id))];
    const { data: sponsors } = sponsorIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, name')
            .in('id', sponsorIds)
        : { data: [] };

    const sponsorNameMap: Record<string, string> = {};
    (sponsors ?? []).forEach((s: { id: string; name: string | null }) => {
        sponsorNameMap[s.id] = s.name || 'Someone';
    });

    return (
        <DashboardLayout firstName={firstName} userId={user.id} userType="SINGLE">
            <SingleDashboardClient
                userId={user.id}
                userName={profile.name}
                userProfilePic={profile.photos && profile.photos.length > 0 ? profile.photos[0] : null}
                sponsor={sponsor}
                userPhotos={profile.photos || []}
                pausedAt={profile.paused_at}
                onboardedAt={profile.onboarded_at}
                photos={profile.photos}
                matchmakrEndorsement={profile.matchmakr_endorsement}
                approvedMatchCount={approvedMatchCount}
                pendingSponsorshipRequests={pendingRequests ?? []}
                sponsorNameMap={sponsorNameMap}
            />
        </DashboardLayout>
    );
}

// Client wrapper component
export default function SingleDashboardPage() {
    return (
        <DashboardWrapper expectedUserType="SINGLE">
            <SingleDashboardContent />
        </DashboardWrapper>
    );
} 