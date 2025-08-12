import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import VendorProfileClient from '@/components/dashboard/VendorProfileClient';
import React from 'react';

// Server component to fetch initial data
async function VendorDashboardContent() {
    const cookieStore = cookies();
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || profile.user_type !== 'VENDOR') {
        // Redirect if not a vendor, or no profile found
        redirect('/');
    }

    return (
        <VendorProfileClient profile={profile} />
    );
}

// Client wrapper component
function VendorDashboardClient() {
    return (
        <DashboardWrapper>
            <VendorDashboardContent />
        </DashboardWrapper>
    );
}

export default function VendorDashboardPage() {
    return <VendorDashboardClient />;
} 