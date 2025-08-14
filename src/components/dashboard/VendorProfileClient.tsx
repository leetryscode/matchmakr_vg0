'use client';

import React, { useState } from 'react';
import PhotoGallery from '../profile/PhotoGallery';
import Link from 'next/link';
import { VendorProfile } from '../profile/types';

interface VendorProfileClientProps {
  vendorProfile: VendorProfile;
}

const VendorProfileClient: React.FC<VendorProfileClientProps> = ({ vendorProfile }) => {
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  
  // Debug: Log vendor profile data to see what we're working with
  console.log('Vendor Profile Data:', {
    business_name: vendorProfile.business_name,
    industry: vendorProfile.industry,
    street_address: vendorProfile.street_address,
    city: vendorProfile.city,
    state: vendorProfile.state,
    zip_code: vendorProfile.zip_code
  });

  return (
    <>
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        {/* Photo Gallery - Similar to single user profile */}
        <PhotoGallery 
          userId={vendorProfile.id} 
          photos={vendorProfile.photos || []}
          userType="VENDOR"
          canEdit={true}
        />
        
        <div className="p-0">
          {/* Business Information Section */}
          <div>
            <h1 className="text-4xl font-light text-white">{vendorProfile.business_name}</h1>
            <p className="text-lg font-light text-white/80 mt-2">
              {vendorProfile.industry || 'Business Type Not Set'}
            </p>
            <p className="text-base font-light text-white/70 mt-2 flex items-center">
              <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M8 1C5.24 1 3 3.24 3 6c0 2.25 5 9 5 9s5-6.75 5-9c0-2.76-2.24-5-5-5z" fill="#fff" stroke="none"/>
                  <circle cx="8" cy="6" r="2" fill="white"/>
                </svg>
              </span>
              {vendorProfile.street_address && vendorProfile.city && vendorProfile.state ? 
                `${vendorProfile.street_address}, ${vendorProfile.city}, ${vendorProfile.state}${vendorProfile.zip_code ? ` ${vendorProfile.zip_code}` : ''}` : 
                'Address Not Set'
              }
            </p>
          </div>
          
          {/* Business Stats - Similar to single user interests section */}
          <div className="mt-6 bg-white/10 p-6 rounded-xl border border-white/20">
            <h2 className="text-2xl font-light text-white mb-4">Business Overview</h2>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-light text-primary-teal">0</div>
                <div className="text-sm font-light text-white/80 mt-1">Active Offers</div>
              </div>
              <div>
                <div className="text-3xl font-light text-primary-blue">0</div>
                <div className="text-sm font-light text-white/80 mt-1">Total Claims</div>
              </div>
              <div>
                <div className="text-3xl font-light text-green-400">0</div>
                <div className="text-sm font-light text-white/80 mt-1">New Customers</div>
              </div>
            </div>
          </div>
          
          {/* Offers Section - New section for vendor-specific content */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light text-white">Offers</h2>
              <button
                onClick={() => setShowCreateOffer(true)}
                className="bg-white/10 text-white px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors font-light text-base"
              >
                Create New Offer
              </button>
            </div>
            
            {/* Placeholder for offers - similar to single user interests */}
            <div className="bg-white/10 p-8 rounded-xl border border-white/20 text-center">
              <div className="text-6xl text-white/30 mb-4">📋</div>
              <p className="text-lg font-light text-white/70 mb-2">No offers yet</p>
              <p className="text-base font-light text-white/50">Create your first offer to start attracting customers</p>
            </div>
          </div>
          
          {/* Account Settings Button - Positioned at bottom left */}
          <div className="mt-8 text-left">
            <Link 
              href="/dashboard/settings"
              className="bg-white/10 text-white px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors text-sm font-light"
            >
              Account Settings
            </Link>
          </div>
        </div>
      </div>
      
      {/* Create Offer Modal - Placeholder for now */}
      {showCreateOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-light mb-4">Create New Offer</h3>
            <p className="text-gray-600 mb-4 font-light">Offer creation functionality coming soon!</p>
            <button
              onClick={() => setShowCreateOffer(false)}
              className="w-full bg-primary-blue text-white py-3 rounded-lg hover:bg-primary-blue-dark transition-colors font-light"
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