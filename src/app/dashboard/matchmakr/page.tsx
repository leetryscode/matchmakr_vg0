import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import React from 'react';
import InviteSingle from '@/components/dashboard/InviteSingle';
import InviteOtherMatchMakrs from '@/components/dashboard/InviteOtherMatchMakrs';

// Placeholder components for the UI sections
const SinglesPondButton = () => (
    <div className="text-center mb-8">
        <button className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-600 transition-colors">
            Singles Pond
        </button>
    </div>
);

const MatchMakrChatList = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">MatchMakr Chat</h2>
        <p className="text-gray-600">Chat windows with other MatchMakrs like you, on behalf of their sponsored singles =)</p>
        <div className="mt-4 p-4 border rounded-lg">
             <p className="text-center text-gray-500">You have no more chats with MatchMakrs.</p>
        </div>
        <button className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold">
            Invite a MatchMakr!
        </button>
    </div>
);

const ManageSinglesList = () => (
     <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-bold mb-4">Manage Singles</h2>
        <div className="mt-4 p-4 border rounded-lg">
             <p className="text-center text-gray-500">Chats with the singles you manage.</p>
        </div>
        <button className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold">
            Invite a Single!
        </button>
    </div>
);


export default async function MatchMakrDashboardPage() {
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
    
    // Fetch the list of singles sponsored by this MatchMakr
    const { data: sponsoredSingles } = await supabase
        .from('profiles')
        .select('id, name, profile_pic_url')
        .eq('sponsored_by_id', user.id)
        .eq('user_type', 'SINGLE');

    const firstName = profile.name?.split(' ')[0] || null;

    return (
        <DashboardLayout firstName={firstName} userId={user.id}>
            <SinglesPondButton />
            <InviteOtherMatchMakrs />
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h2 className="text-2xl font-bold mb-4">Manage Your Singles</h2>
                <div className="space-y-4">
                    {sponsoredSingles && sponsoredSingles.length > 0 ? (
                        sponsoredSingles.map(single => (
                            <div key={single.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200">
                                        {single.profile_pic_url ? (
                                            <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-gray-500">
                                                {single.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-gray-800">{single.name}</span>
                                </div>
                                <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">View Profile</button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">You are not sponsoring any singles yet.</p>
                    )}
                </div>
                <InviteSingle />
            </div>
        </DashboardLayout>
    );
} 