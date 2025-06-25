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
        <div className="flex flex-col min-h-screen bg-background-main text-gray-800">
            {/* Modern Gradient Header */}
            <header className="bg-gradient-primary text-white text-center py-10 px-4 rounded-b-2xl shadow-header">
                <h1 className="font-inter font-bold text-3xl mb-2">
                    Hello, <span className="text-accent-yellow font-semibold">{firstName || 'User'}</span>, welcome to MatchMakr
                </h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Modern Bottom Navigation */}
            <footer className="bg-background-card shadow-card p-6 mt-auto">
                <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6 text-center">
                    <button 
                        onClick={() => router.push(`/profile/${userId}`)}
                        className="bg-gradient-primary text-white p-6 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-primary-blue"
                    >
                        <div className="font-inter font-bold text-2xl mb-2">My Profile</div>
                        <div className="font-raleway text-sm opacity-90">Edit your matchmaking profile</div>
                    </button>
                    <button 
                        onClick={() => router.push('/dates')}
                        className="bg-gradient-accent text-gray-800 p-6 rounded-xl shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2 border-2 border-accent-yellow"
                    >
                        <div className="font-inter font-bold text-2xl mb-2">Discover Dates</div>
                        <div className="font-raleway text-sm opacity-90">Find perfect matches nearby</div>
                    </button>
                </div>
                <div className="mt-6 flex justify-around text-sm text-gray-500">
                    <button onClick={() => router.push('/settings')} className="hover:text-primary-blue hover:underline transition-colors">Account Setting</button>
                    <button onClick={handleSignOut} className="hover:text-accent-coral hover:underline transition-colors">Log out</button>
                </div>
            </footer>
        </div>
    );
} 