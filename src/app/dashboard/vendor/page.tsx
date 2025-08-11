import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
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

    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id}>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Vendor Dashboard</h2>
                <p className="text-gray-600">This page is under construction. Your full vendor management tools will be available here soon!</p>
            </div>
            
            {/* Settings Button - positioned normally in page flow */}
            <div className="w-full flex justify-center mt-8 mb-4">
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
export default function VendorDashboardPage() {
    return (
        <DashboardWrapper expectedUserType="VENDOR">
            <VendorDashboardContent />
        </DashboardWrapper>
    );
} 