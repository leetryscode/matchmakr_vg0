'use client';

import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName: string | null;
    userId: string;
}

export default function DashboardLayout({ children, firstName, userId }: DashboardLayoutProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
            {/* Header */}
            <header className="bg-white shadow-md p-4">
                <h1 className="text-2xl font-bold text-center">
                    Hello, <span className="text-pink-500">{firstName || 'User'}</span>, welcome to MatchMakr
                </h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <footer className="bg-white shadow-up p-4 mt-auto">
                <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4 text-center font-semibold">
                    <button 
                        onClick={() => router.push(`/profile/${userId}`)}
                        className="p-4 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
                    >
                        My Profile
                    </button>
                    <button 
                        onClick={() => router.push('/dates')}
                        className="p-4 bg-yellow-400 text-white rounded-lg shadow-lg hover:bg-yellow-500 transition-colors"
                    >
                        Discover Dates
                    </button>
                </div>
                <div className="mt-4 flex justify-around text-sm text-gray-500">
                    <button onClick={() => router.push('/settings')} className="hover:underline">Account Setting</button>
                    <button onClick={handleSignOut} className="hover:underline">Log out</button>
                </div>
            </footer>
        </div>
    );
} 