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

    // Fetch vendor profile from the vendor_profiles table
    const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!vendorProfile) {
        // Redirect if no vendor profile found
        redirect('/');
    }

    return (
        <VendorProfileClient vendorProfile={vendorProfile} />
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