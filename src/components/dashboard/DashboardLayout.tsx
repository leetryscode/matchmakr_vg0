'use client';

import React from 'react';
import { OrbitUserRole } from '@/types/orbit';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName?: string | null; // Optional for shared pages
    userId: string;
    userType?: OrbitUserRole; // Only Orbit roles (SINGLE | MATCHMAKR)
}

export default function DashboardLayout({ children, firstName, userId, userType }: DashboardLayoutProps) {
    return (
        <div className="flex flex-col min-h-[100dvh] w-full text-white relative">
            {/* Brand Header - consistent spacing across all dashboard pages */}
            <header className="flex flex-col items-center pt-8 pb-6">
                <div className="type-meta tracking-[0.15em] uppercase font-brand">Orbit</div>
            </header>
            {/* Main Content - standardized responsive padding rhythm */}
            {/* GlobalLayout handles bottom padding for bottom nav; no extra padding needed here */}
            <main className="flex-grow px-4 sm:px-6 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
} 