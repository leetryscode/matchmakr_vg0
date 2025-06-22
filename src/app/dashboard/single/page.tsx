import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';

// Placeholder components for the UI sections
const SinglesChat = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Singles Chat</h2>
        <p className="text-gray-600">On MatchMakr, you don't get to choose your matches...</p>
        <div className="mt-4 p-4 border rounded-lg">
             <p className="text-center text-gray-500">You have no more chats with matches at this time. Remember, the goal is not to get a lot of matches... it's to get the right match!</p>
        </div>
    </div>
);

export default async function SingleDashboardPage() {
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

    if (!profile || profile.user_type !== 'SINGLE') {
        // Redirect if not a single, or no profile found
        redirect('/');
    }
    
    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id}>
            <SinglesChat />
            <InviteMatchMakr />
        </DashboardLayout>
    );
} 