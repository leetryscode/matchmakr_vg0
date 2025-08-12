'use client';

import React, { useState } from 'react';
import PhotoGallery from '../profile/PhotoGallery';
import Link from 'next/link';
import { Profile } from '../profile/types';

interface VendorProfileClientProps {
  profile: Profile;
}

const VendorProfileClient: React.FC<VendorProfileClientProps> = ({ profile }) => {
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  
  // Debug: Log profile data to see what we're working with
  console.log('Vendor Profile Data:', {
    business_name: profile.business_name,
    name: profile.name,
    industry: profile.industry,
    street_address: profile.street_address,
    city: profile.city,
    state: profile.state,
    zip_code: profile.zip_code
  });

  return (
    <>
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        {/* Photo Gallery - Similar to single user profile */}
        <PhotoGallery 
          userId={profile.id} 
          photos={profile.photos}
          userType="VENDOR"
          canEdit={true}
        />
        
        <div className="p-0">
          {/* Business Information Section */}
          <div>
            <h1 className="text-3xl font-bold text-white">{profile.business_name || profile.name}</h1>
            <p className="text-lg text-white/80 mt-1">
              {profile.industry || 'Business Type Not Set'}
            </p>
            <p className="text-white/70 mt-1 text-sm">
              {profile.street_address ? 
                `${profile.street_address}${profile.address_line_2 ? `, ${profile.address_line_2}` : ''}` : 
                'Address Not Set'
              }
            </p>
          </div>
          
          {/* City/State/ZIP - Always show, with fallback if missing */}
          <p className="text-white/60 mt-1 text-sm flex items-center">
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                <path d="M8 1C5.24 1 3 3.24 3 6c0 2.25 5 9 5 9s5-6.75 5-9c0-2.76-2.24-5-5-5z" fill="#fff" stroke="none"/>
                <circle cx="8" cy="6" r="2" fill="white"/>
              </svg>
            </span>
            {profile.city && profile.state ? 
              `${profile.city}, ${profile.state}${profile.zip_code ? ` ${profile.zip_code}` : ''}` : 
              'Location Not Set'
            }
          </p>
          
          {/* Business Description - Similar to single user bio */}
          {profile.bio && (
            <p className="text-white/80 mt-3 text-lg leading-relaxed">
              {profile.bio}
            </p>
          )}
          
          {/* Business Stats - Similar to single user interests section */}
          <div className="mt-4 bg-white/10 p-4 rounded-xl border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-3">Business Overview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary-teal">0</div>
                <div className="text-sm text-white/80">Active Offers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-blue">0</div>
                <div className="text-sm text-white/80">Total Claims</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">0</div>
                <div className="text-sm text-white/80">New Customers</div>
              </div>
            </div>
          </div>
          
          {/* Edit Profile Button - Smaller and positioned below stats */}
          <div className="mt-4 text-center">
            <Link 
              href="/dashboard/settings"
              className="bg-white/10 text-white px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors text-xs font-medium"
            >
              Edit Profile
            </Link>
          </div>
          
          {/* Offers Section - New section for vendor-specific content */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Offers</h2>
              <button
                onClick={() => setShowCreateOffer(true)}
                className="bg-primary-blue text-white px-6 py-2 rounded-full hover:bg-primary-blue-dark transition-colors font-semibold"
              >
                Create New Offer
              </button>
            </div>
            
            {/* Placeholder for offers - similar to single user interests */}
            <div className="bg-white/10 p-8 rounded-xl border border-white/20 text-center">
              <div className="text-6xl text-white/30 mb-4">📋</div>
              <p className="text-white/70 text-lg mb-2">No offers yet</p>
              <p className="text-white/50 text-sm">Create your first offer to start attracting customers</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Offer Modal - Placeholder for now */}
      {showCreateOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Offer</h3>
            <p className="text-gray-600 mb-4">Offer creation functionality coming soon!</p>
            <button
              onClick={() => setShowCreateOffer(false)}
              className="w-full bg-primary-blue text-white py-2 rounded-lg hover:bg-primary-blue-dark transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VendorProfileClient; 