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
            <SingleDashboardClient
                userId={user.id}
                userName={profile.name}
                userProfilePic={profile.photos && profile.photos.length > 0 ? profile.photos[0] : null}
                sponsor={sponsor}
                userPhotos={profile.photos || []}
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