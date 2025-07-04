"use client";
import React, { useState } from 'react';
import ChatModal from '@/components/chat/ChatModal';
import InviteMatchMakr from '@/components/dashboard/InviteMatchMakr';
import { createClient } from '@/lib/supabase/client';

interface SingleDashboardClientProps {
  userId: string;
  userName: string;
  userProfilePic: string | null;
  sponsor: { id: string; name: string | null; profile_pic_url: string | null } | null;
  userPhotos: string[];
}

const SingleDashboardClient: React.FC<SingleDashboardClientProps> = ({ userId, userName, userProfilePic, sponsor, userPhotos }) => {
  const [openChat, setOpenChat] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  const handleRemoveSponsor = async () => {
    try {
      const { error } = await supabase.functions.invoke('end-sponsorship');
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  if (!sponsor) {
    return <InviteMatchMakr />;
  }

  return (
    <div className="bg-background-card p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-primary-blue/10 mb-8">
      <h2 className="font-inter font-bold text-3xl text-gray-800 mb-3">Your MatchMakr</h2>
      <div className="divide-y divide-gray-200 mb-6">
        <div
          className="flex items-center gap-4 py-4 w-full hover:bg-gray-50 rounded-lg transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue"
          role="button"
          tabIndex={0}
          onClick={() => setOpenChat(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenChat(true); } }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border border-accent-teal-light bg-gray-100 flex-shrink-0">
            {sponsor.profile_pic_url ? (
              <img src={sponsor.profile_pic_url} alt={sponsor.name || 'MatchMakr'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                {sponsor.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{sponsor.name || 'Unknown MatchMakr'}</div>
            <div className="text-sm text-gray-500 truncate">Click to chat with your MatchMakr</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="mt-2 text-sm text-gray-500 hover:text-primary-blue hover:underline transition-colors"
      >
        End sponsorship
      </button>
      {/* Chat Modal */}
      {openChat && (
        <ChatModal
          open={openChat}
          onClose={() => setOpenChat(false)}
          currentUserId={userId}
          currentUserName={userName}
          currentUserProfilePic={userProfilePic}
          otherUserId={sponsor.id}
          otherUserName={sponsor.name || ''}
          otherUserProfilePic={sponsor.profile_pic_url}
          aboutSingleA={{ id: userId, name: userName, photo: userPhotos && userPhotos.length > 0 ? userPhotos[0] : null }}
          aboutSingleB={{ id: sponsor.id, name: sponsor.name || '', photo: sponsor.profile_pic_url }}
        />
      )}
      {/* End Sponsorship Modal */}
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
    </div>
  );
};

export default SingleDashboardClient; 