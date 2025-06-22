import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';

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

const MatchMakrChat = () => (
     <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-bold mb-4">Chat With my MatchMakr</h2>
        <div className="mt-4 p-4 border rounded-lg flex items-center justify-between">
            <span className="text-gray-700">Chat with the user who manages your profile!</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">View Profile</button>
        </div>
        <button className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold">
            Invite someone to be your MatchMakr!
        </button>
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
            <MatchMakrChat />
        </DashboardLayout>
    );
} 