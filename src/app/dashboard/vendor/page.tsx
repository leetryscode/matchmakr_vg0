import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import OfferList from '@/components/dashboard/OfferList';
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
        .select('name, user_type')
        .eq('id', user.id)
        .single();

    if (!profile || profile.user_type !== 'VENDOR') {
        // Redirect if not a vendor, or no profile found
        redirect('/');
    }

    const firstName = profile.name?.split(' ')[0] || profile.name || 'Vendor';

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="text-center">
                <h1 className="text-4xl font-light gradient-text leading-[1.1] tracking-tight sm:text-[5rem] mb-4">
                    Welcome, {firstName}!
                </h1>
                <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
                    Create and manage your offers to attract customers. Track performance and engage with your audience.
                </p>
            </div>

            {/* Business Profile Summary */}
            <div className="bg-white/10 p-6 rounded-xl shadow-card border border-white/20">
                <h2 className="text-2xl font-semibold text-white mb-4">Business Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary-teal">Active</div>
                        <div className="text-sm opacity-80">Offers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary-blue">0</div>
                        <div className="text-sm opacity-80">Total Claims</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">New</div>
                        <div className="text-sm opacity-80">Customers</div>
                    </div>
                </div>
            </div>

            {/* Offers Management */}
            <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
                <OfferList vendorId={user.id} />
            </div>
        </div>
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