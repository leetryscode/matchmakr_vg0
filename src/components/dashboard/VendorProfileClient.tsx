'use client';

import React, { useState, useEffect } from 'react';
import PhotoGallery from '../profile/PhotoGallery';
import Link from 'next/link';
import { VendorProfile, Offer } from '../profile/types';
import CreateOfferModal from './CreateOfferModal';
import OfferList from './OfferList';
import { createClient } from '@/lib/supabase/client';

interface VendorProfileClientProps {
  vendorProfile: VendorProfile;
}

const VendorProfileClient: React.FC<VendorProfileClientProps> = ({ vendorProfile }) => {
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  // Debug: Log vendor profile data to see what we're working with
  console.log('Vendor Profile Data:', {
    business_name: vendorProfile.business_name,
    industry: vendorProfile.industry,
    street_address: vendorProfile.street_address,
    city: vendorProfile.city,
    state: vendorProfile.state,
    zip_code: vendorProfile.zip_code
  });

  // Fetch offers for this vendor
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('vendor_id', vendorProfile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching offers:', error);
          return;
        }

        setOffers(data || []);
      } catch (error) {
        console.error('Exception fetching offers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [vendorProfile.id, supabase]);

  // Handle offer actions
  const handleOfferCreated = () => {
    // Refresh offers list
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('vendor_id', vendorProfile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching offers:', error);
          return;
        }

        setOffers(data || []);
      } catch (error) {
        console.error('Exception fetching offers:', error);
      }
    };

    fetchOffers();
    setShowCreateOffer(false);
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/offers?id=${offerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting offer:', errorData.error);
        return;
      }

      // Remove from local state
      setOffers(offers.filter(offer => offer.id !== offerId));
    } catch (error) {
      console.error('Exception deleting offer:', error);
    }
  };

  const handleToggleOfferActive = async (offerId: string) => {
    try {
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;

      const { error } = await supabase
        .from('offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offerId);

      if (error) {
        console.error('Error updating offer:', error);
        return;
      }

      // Update local state
      setOffers(offers.map(o => 
        o.id === offerId ? { ...o, is_active: !o.is_active } : o
      ));
    } catch (error) {
      console.error('Exception updating offer:', error);
    }
  };

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
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }} className="text-white/70">
                  <path d="M8 1C5.24 1 3 3.24 3 6c0 2.25 5 9 5 9s5-6.75 5-9c0-2.76-2.24-5-5-5z" fill="currentColor" stroke="none"/>
                  <circle cx="8" cy="6" r="2" fill="currentColor"/>
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
                <div className="text-3xl font-light text-primary-blue">
                  {offers.filter(o => o.is_active).length}
                </div>
                <div className="text-sm font-light text-white/80 mt-1">Active Offers</div>
              </div>
              <div>
                <div className="text-3xl font-light text-primary-blue">
                  {offers.reduce((sum, o) => sum + o.claim_count, 0)}
                </div>
                <div className="text-sm font-light text-white/80 mt-1">Total Claims</div>
              </div>
              <div>
                <div className="text-3xl font-light text-green-400">
                  {offers.length}
                </div>
                <div className="text-sm font-light text-white/80 mt-1">Total Offers</div>
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
            
            {/* Offers List */}
            {loading ? (
              <div className="bg-white/10 p-8 rounded-xl border border-white/20 text-center">
                <div className="text-6xl text-white/30 mb-4">⏳</div>
                <p className="text-lg font-light text-white/70">Loading offers...</p>
              </div>
            ) : (
              <OfferList
                offers={offers}
                onDeleteOffer={handleDeleteOffer}
                onToggleOfferActive={handleToggleOfferActive}
              />
            )}
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
      
      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateOffer}
        onClose={() => setShowCreateOffer(false)}
        onOfferCreated={handleOfferCreated}
      />
    </>
  );
};

export default VendorProfileClient; 