'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrbitUserRole } from '@/types/orbit';

interface DashboardLayoutProps {
    children: React.ReactNode;
    firstName: string | null;
    userId: string;
    userType?: OrbitUserRole; // Only Orbit roles (SINGLE | MATCHMAKR)
}

export default function DashboardLayout({ children, firstName, userId, userType }: DashboardLayoutProps) {
    const { signOut } = useAuth();

    const handleLogout = async () => {
        console.log('Logout button clicked');
        try {
            // Call server-side logout route
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                console.log('Server logout successful');
                // Clear client-side storage
                localStorage.clear();
                sessionStorage.clear();
                // Clear all cookies
                document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                // Redirect to login
                window.location.href = '/login';
            } else {
                console.error('Server logout failed');
                window.location.href = '/login';
            }
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/login';
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full text-white relative">
            {/* Brand Header - consistent spacing across all dashboard pages */}
            <header className="flex flex-col items-center pt-8 pb-6">
                <div className="text-lg font-light tracking-[0.15em] text-white uppercase font-brand">Orbit</div>
            </header>
            {/* Main Content - standardized responsive padding rhythm */}
            {/* GlobalLayout handles bottom padding for bottom nav; no extra padding needed here */}
            <main className="flex-grow px-4 sm:px-6 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
            {/* Logout Button - Bottom Left, positioned above bottom nav */}
            {/* GlobalLayout handles bottom nav padding, but absolute positioning needs manual offset */}
            <div className="absolute bottom-[calc(var(--bottom-nav-h,72px)+1rem)] left-4">
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg border border-white/20 hover:bg-white/20 hover:text-red-200 transition-all duration-200 shadow-lg"
                    title="Sign Out"
                >
                    {/* Logout SVG */}
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16,17 21,12 16,7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
} 