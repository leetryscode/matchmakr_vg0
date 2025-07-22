"use client";

import EndSponsorshipSection from './EndSponsorshipSection';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [sponsor, setSponsor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    console.log('Settings page useEffect:', { authLoading, user: !!user, loading });
    
    // Redirect if not authenticated
    if (!authLoading && !user) {
      console.log('Settings: No user, redirecting to login');
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      if (!user) return;
      
      console.log('Settings: Fetching profile for user:', user.id);
      
      try {
        // Fetch the user's profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('Settings: Profile fetch result:', { profileData, error });

        if (error) {
          console.error('Settings: Error fetching profile:', error);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch sponsor if user is a SINGLE and has one
        if (profileData.user_type === 'SINGLE' && profileData.sponsored_by_id) {
          console.log('Settings: Fetching sponsor for single user');
          const { data: sponsorProfile } = await supabase
            .from('profiles')
            .select('id, name, photos')
            .eq('id', profileData.sponsored_by_id)
            .single();

          console.log('Settings: Sponsor fetch result:', sponsorProfile);

          if (sponsorProfile) {
            setSponsor({
              ...sponsorProfile,
              profile_pic_url: sponsorProfile.photos && sponsorProfile.photos.length > 0 ? sponsorProfile.photos[0] : null
            });
          }
        }
      } catch (error) {
        console.error('Settings: Error in settings:', error);
      } finally {
        console.log('Settings: Setting loading to false');
        setLoading(false);
      }
    };

    if (user) {
      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('Settings: Loading timeout reached, allowing access');
        setLoadingTimeout(true);
        setLoading(false);
      }, 5000); // 5 second timeout
      
      fetchProfile();
      
      return () => clearTimeout(timeout);
    }
  }, [user, supabase, authLoading, router]);

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

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show loading while fetching profile
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
        <div className="text-lg">Unable to load profile.</div>
      </div>
    );
  }

  // Render different content based on user type
  const renderUserTypeContent = () => {
    switch (profile.user_type) {
      case 'SINGLE':
        return (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6">Single Settings</h2>
            {sponsor ? (
              <EndSponsorshipSection sponsor={sponsor} />
            ) : (
              <div className="text-lg text-white/80">You do not currently have a Sponsor.</div>
            )}
          </div>
        );
      
      case 'MATCHMAKR':
        return (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6">MatchMakr Settings</h2>
            <div className="text-lg text-white/80 mb-4">MatchMakr-specific settings coming soon!</div>
            <div className="bg-white/10 p-6 rounded-xl border border-white/20">
              <h3 className="text-lg font-semibold mb-3">Account Information</h3>
              <p className="text-white/80">Name: {profile.name || 'Not set'}</p>
              <p className="text-white/80">Email: {user?.email || 'Not set'}</p>
            </div>
          </div>
        );
      
      case 'VENDOR':
        return (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6">Vendor Settings</h2>
            <div className="text-lg text-white/80 mb-4">Vendor-specific settings coming soon!</div>
            <div className="bg-white/10 p-6 rounded-xl border border-white/20">
              <h3 className="text-lg font-semibold mb-3">Account Information</h3>
              <p className="text-white/80">Name: {profile.name || 'Not set'}</p>
              <p className="text-white/80">Email: {user?.email || 'Not set'}</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-lg text-white/80">Unknown user type.</div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* Prominent Logout Button */}
      <div className="w-full max-w-md mb-8">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-colors duration-200 mb-6"
        >
          Sign Out
        </button>
      </div>

      {renderUserTypeContent()}
    </div>
  );
} 