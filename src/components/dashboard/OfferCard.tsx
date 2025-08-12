'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface OfferCardProps {
  offer: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    expires_at: string;
    claim_count: number;
    is_active: boolean;
    photos: string[];
  };
  vendorName?: string;
  showVendorName?: boolean;
  onDelete?: (offerId: string) => void;
  onCancel?: (offerId: string) => void;
  isVendorView?: boolean;
}

export default function OfferCard({ 
  offer, 
  vendorName, 
  showVendorName = false, 
  onDelete, 
  onCancel,
  isVendorView = false 
}: OfferCardProps) {
  const now = new Date();
  const expiresAt = new Date(offer.expires_at);
  const isExpired = now > expiresAt;
  
  // Calculate time remaining as percentage
  const totalDuration = expiresAt.getTime() - new Date(offer.created_at).getTime();
  const timeRemaining = expiresAt.getTime() - now.getTime();
  const percentageRemaining = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));
  
  // Calculate the gauge fill (circular progress)
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentageRemaining / 100) * circumference;

  const getStatusColor = () => {
    if (isExpired) return 'text-gray-400';
    if (percentageRemaining > 50) return 'text-green-500';
    if (percentageRemaining > 25) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (percentageRemaining > 50) return 'Active';
    if (percentageRemaining > 25) return 'Ending Soon';
    return 'Expiring Soon';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {offer.title}
            </h3>
            {isVendorView && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()} bg-gray-100`}>
                {getStatusText()}
              </span>
            )}
          </div>
          
          {showVendorName && vendorName && (
            <p className="text-sm text-gray-600 mb-2">
              {vendorName}
            </p>
          )}
          
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {offer.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Claims: {offer.claim_count}</span>
            {!isExpired && (
              <span>Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}</span>
            )}
            {isExpired && (
              <span className="text-red-500">Expired</span>
            )}
          </div>
        </div>
        
        {/* Gauge/Progress Indicator */}
        <div className="flex-shrink-0 ml-4">
          <div className="relative">
            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
              {/* Background circle */}
              <circle
                cx="16"
                cy="16"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="16"
                cy="16"
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className={getStatusColor()}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                {Math.round(percentageRemaining)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons for Vendor View */}
      {isVendorView && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          {onCancel && !isExpired && (
            <button
              onClick={() => onCancel(offer.id)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(offer.id)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
} 