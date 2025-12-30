'use client';

import React from 'react';
import { OrbitUserRole } from '@/types/orbit';
import BrandMark from '@/components/branding/BrandMark';

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
                <BrandMark className="text-white" />
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