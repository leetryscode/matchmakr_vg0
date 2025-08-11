"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

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
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
      {/* SETTINGS Header - positioned at top of content */}
      <div className="w-full text-center mb-6">
        <h1 className="text-2xl font-light tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>SETTINGS</h1>
      </div>
      
      {/* Basic Account Information */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-white/10 p-6 rounded-xl border border-white/20 mb-6">
          <h2 className="text-xl font-light mb-4 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>ACCOUNT INFORMATION</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-white/80 font-medium">Email:</span>
              <span className="text-white">{user?.email || 'Not set'}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-white/80 font-medium">User ID:</span>
              <span className="text-white font-mono text-sm">{user?.id}</span>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <span className="text-white/80 font-medium">Account Status:</span>
              <span className="text-white">Active</span>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white/10 p-6 rounded-xl border border-white/20">
          <h3 className="text-lg font-light mb-4 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>COMING SOON</h3>
          <div className="text-white/80 text-center">
            <p className="mb-2">• Profile management</p>
            <p className="mb-2">• Photo uploads</p>
            <p className="mb-2">• Phone number management</p>
            <p className="mb-2">• Password changes</p>
            <p className="mb-2">• Notification preferences</p>
            <p>• Privacy settings</p>
          </div>
        </div>
      </div>

      {/* Sign Out Button - positioned at bottom of content */}
      <div className="w-full max-w-md mt-auto">
        <button
          onClick={handleLogout}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/20 transition-all duration-200 shadow-button hover:shadow-button-hover"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
} 