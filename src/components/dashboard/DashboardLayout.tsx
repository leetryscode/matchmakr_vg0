'use client';

import React from 'react';
import BottomNavigation from './BottomNavigation';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName: string | null;
    userId: string;
    userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

export default function DashboardLayout({ children, firstName, userId, userType }: DashboardLayoutProps) {
    return (
        <div className="flex flex-col min-h-screen w-full text-white">
            {/* Brand Header Only */}
            <div className="flex flex-col items-center pt-8 pb-4">
                <div className="text-2xl font-light tracking-wide text-white">GreenLight</div>
            </div>
            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
            {/* Bottom Navigation */}
            <BottomNavigation userId={userId} />
        </div>
    );
} 