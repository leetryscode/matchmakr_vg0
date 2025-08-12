'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
  vendorId: string;
}

export default function CreateOfferModal({ 
  isOpen, 
  onClose, 
  onOfferCreated, 
  vendorId 
}: CreateOfferModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_days: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('offers')
        .insert({
          vendor_id: vendorId,
          title: formData.title,
          description: formData.description,
          duration_days: formData.duration_days,
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      // Reset form and close modal
      setFormData({ title: '', description: '', duration_days: 30 });
      onOfferCreated();
      onClose();
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Create New Offer
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Offer Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Free Coffee, 20% Off Drinks"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your offer in detail..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Days)
              </label>
              <select
                id="duration"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days (default)</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title || !formData.description}
                className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:bg-gradient-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 