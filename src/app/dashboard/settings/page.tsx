"use client";

import { useAuth } from '@/contexts/AuthContext';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return null; // DashboardWrapper handles redirect
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
        // Redirect to welcome page
        window.location.href = '/';
      } else {
        console.error('Server logout failed');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/';
    }
  };

  return (
    <DashboardWrapper>
      <DashboardLayout firstName={null} userId={user.id}>
        <div className="flex flex-col space-y-6 w-full">
          {/* Settings Header */}
          <div className="w-full text-center">
            <h1 className="type-section">Settings</h1>
          </div>
          
          {/* Account Information */}
          <GlassCard variant="1" className="p-6">
            <SectionHeader title="Account information" className="mb-4" />
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
                <span className="text-white/80 font-medium">Account status:</span>
                <span className="text-white">Active</span>
              </div>
            </div>
          </GlassCard>

          {/* Coming Soon Section */}
          <GlassCard variant="1" className="p-6">
            <SectionHeader title="Coming soon" className="mb-4" />
            <div className="text-white/80 text-center">
              <p className="mb-2">• Profile management</p>
              <p className="mb-2">• Photo uploads</p>
              <p className="mb-2">• Phone number management</p>
              <p className="mb-2">• Password changes</p>
              <p className="mb-2">• Notification preferences</p>
              <p>• Privacy settings</p>
            </div>
          </GlassCard>

          {/* Sign Out Button */}
          <div className="w-full max-w-md mx-auto mt-6">
            <button
              onClick={handleLogout}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/20 transition-all duration-200 shadow-button hover:shadow-button-hover"
            >
              Sign Out
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardWrapper>
  );
} 