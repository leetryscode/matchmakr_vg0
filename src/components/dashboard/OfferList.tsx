'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import OfferCard from './OfferCard';
import CreateOfferModal from './CreateOfferModal';

interface Offer {
  id: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  claim_count: number;
  is_active: boolean;
  photos: string[];
}

interface OfferListProps {
  vendorId: string;
}

export default function OfferList({ vendorId }: OfferListProps) {
  const supabase = createClient();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchOffers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setOffers(data || []);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [vendorId]);

  const handleOfferCreated = () => {
    fetchOffers(); // Refresh the list
  };

  const handleCancelOffer = async (offerId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('offers')
        .update({ is_active: false })
        .eq('id', offerId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Update local state
      setOffers(offers.map(offer => 
        offer.id === offerId ? { ...offer, is_active: false } : offer
      ));
    } catch (error: any) {
      setError(error.message || 'Failed to cancel offer');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      // Remove from local state
      setOffers(offers.filter(offer => offer.id !== offerId));
    } catch (error: any) {
      setError(error.message || 'Failed to delete offer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading offers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchOffers}
          className="mt-2 text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Offers</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-primary text-white px-4 py-2 rounded-lg hover:bg-gradient-light transition-all duration-300 shadow-button hover:shadow-button-hover"
        >
          Create New Offer
        </button>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
          <p className="text-gray-500 mb-4">Create your first offer to start attracting customers!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-primary text-white px-4 py-2 rounded-lg hover:bg-gradient-light transition-all duration-300"
          >
            Create Your First Offer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isVendorView={true}
              onCancel={handleCancelOffer}
              onDelete={handleDeleteOffer}
            />
          ))}
        </div>
      )}

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOfferCreated={handleOfferCreated}
        vendorId={vendorId}
      />
    </div>
  );
} 