"use client";
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function EndSponsorshipSection({ sponsor }: { sponsor: { id: string, name: string, profile_pic_url: string | null } }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleRemoveSponsor = async () => {
    const supabase = createClient();
    try {
      const { error } = await supabase.functions.invoke('end-sponsorship');
      if (error) throw new Error(error.message);
      window.location.href = '/dashboard/single';
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };
  return (
    <>
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-white bg-gray-200 overflow-hidden mb-2">
          {sponsor.profile_pic_url ? (
            <img src={sponsor.profile_pic_url} alt={sponsor.name || 'MatchMakr'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-blue">{sponsor.name?.charAt(0).toUpperCase() || '?'}</div>
          )}
        </div>
        <div className="font-semibold text-lg mb-1">{sponsor.name}</div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-red-500 underline text-base hover:text-red-600 focus:outline-none"
        >
          End Sponsorship
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-primary-blue">End Sponsorship with {sponsor.name || 'your MatchMakr'}?</h2>
            <p className="text-gray-600 mb-6">
              They will no longer be able to manage your profile or find matches on your behalf. This action cannot be undone, and you would need to invite them again to reconnect. This will also permanently delete your chat history.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleRemoveSponsor} className="px-6 py-2 bg-gradient-primary text-white rounded-md hover:bg-gradient-light font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
                Yes, End Sponsorship
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 