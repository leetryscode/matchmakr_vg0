'use client';

import React from 'react';
import { Offer } from '../profile/types';
import OfferCard from './OfferCard';

interface OfferListProps {
  offers: Offer[];
  onEditOffer?: (offer: Offer) => void;
  onDeleteOffer?: (offerId: string) => void;
  onToggleOfferActive?: (offerId: string) => void;
}

export default function OfferList({ 
  offers, 
  onEditOffer, 
  onDeleteOffer, 
  onToggleOfferActive 
}: OfferListProps) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
        <p className="text-gray-500">Create your first offer to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          onEdit={onEditOffer ? () => onEditOffer(offer) : undefined}
          onDelete={onDeleteOffer ? () => onDeleteOffer(offer.id) : undefined}
          onToggleActive={onToggleOfferActive ? () => onToggleOfferActive(offer.id) : undefined}
        />
      ))}
    </div>
  );
} 