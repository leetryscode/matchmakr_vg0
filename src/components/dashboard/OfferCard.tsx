'use client';

import React from 'react';
import { Offer } from '../profile/types';

interface OfferCardProps {
  offer: Offer;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
}

export default function OfferCard({ offer, onEdit, onDelete, onToggleActive }: OfferCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const expiry = new Date(offer.expires_at);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isExpired = daysRemaining === 0;

  return (
    <div className="bg-white rounded-card-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Photo Section */}
      <div className="relative h-48 bg-gray-100">
        {offer.photos && offer.photos.length > 0 ? (
          <img
            src={offer.photos[0]}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            offer.is_active && !isExpired 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {offer.is_active && !isExpired ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {offer.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {offer.description}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {offer.claim_count} claims
            </span>
          </div>
          
          <span className="text-xs">
            Created {formatDate(offer.created_at)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 text-sm font-medium text-primary-blue bg-primary-blue/10 rounded-md hover:bg-primary-blue/20 transition-colors"
            >
              Edit
            </button>
          )}
          
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                offer.is_active 
                  ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
                  : 'text-green-600 bg-green-50 hover:bg-green-100'
              }`}
            >
              {offer.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 