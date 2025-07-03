"use client";
import React, { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import EditProfileModal from './EditProfileModal';
import EditProfileButton from './EditProfileButton';
import Link from 'next/link';
import { Profile } from './types';
import ChatModal from '../chat/ChatModal';

// Types for sponsored singles and matchmakr
interface SponsoredSingle {
  id: string;
  name: string | null;
  profile_pic_url: string | null;
}
interface MatchmakrProfile {
  id: string;
  name: string | null;
  profile_pic_url: string | null;
}

interface ProfileClientProps {
  profile: Profile;
  sponsoredSingles: SponsoredSingle[] | null;
  matchmakrProfile: MatchmakrProfile | null;
  isOwnProfile: boolean;
  isSponsorViewing: boolean;
  currentUserProfile: { user_type: string } | null;
}

function calculateAge(birthYear: number | null): number | null {
  if (!birthYear) return null;
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

const ProfileClient: React.FC<ProfileClientProps> = ({
  profile,
  sponsoredSingles,
  matchmakrProfile,
  isOwnProfile,
  isSponsorViewing,
  currentUserProfile,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const age = calculateAge(profile.birth_year);
  const firstName = profile.name?.split(' ')[0] || '';

  return (
    <>
      <div className="min-h-screen bg-gradient-main p-4 sm:p-6 md:p-8">
        <div className="max-w-sm mx-auto gradient-border rounded-2xl shadow-deep overflow-hidden border border-accent-teal-light" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #E6F7FA 100%)' }}>
          <PhotoGallery 
            userId={profile.id} 
            photos={profile.photos}
            userType={profile.user_type}
          />

          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold gradient-text">{profile.name}</h1>
                <p className="text-lg text-text-light">{[profile.occupation, age ? age : null].filter(Boolean).join(', ')}</p>
              </div>
              {isOwnProfile && (
                <EditProfileButton profile={profile} />
              )}
            </div>
            {profile.user_type === 'SINGLE' && (profile.city || profile.state || profile.zip_code) && (
              <p className="text-text-light mt-1">
                📍 {[profile.city, profile.state].filter(Boolean).join(', ')}
                {profile.zip_code && ` ${profile.zip_code}`}
              </p>
            )}
            <div className="mt-6 border-t border-border-light pt-4">
              <h2 className="text-lg font-semibold text-primary-blue">About {firstName}</h2>
              <p className="mt-2 text-sm text-text-dark">{profile.bio || 'No bio yet.'}</p>
            </div>
            {profile.user_type === 'SINGLE' && (
              <div className="mt-6 border-t border-primary-teal border-opacity-30 pt-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-primary-teal">What their MatchMakr says</h2>
                  {isSponsorViewing && (
                    <EditProfileButton profile={profile} canEditEndorsementOnly={true} />
                  )}
                </div>
                <p className="mt-2 text-sm text-text-dark">{profile.matchmakr_endorsement || 'This is where your matchmakr writes about you...'}</p>
              </div>
            )}
            {profile.user_type === 'MATCHMAKR' && (
              <div className="mt-6 border-t border-primary-teal border-opacity-30 pt-4">
                <h2 className="text-lg font-semibold text-primary-teal">Sponsored Singles</h2>
                {sponsoredSingles && sponsoredSingles.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {sponsoredSingles.map(single => (
                      <Link href={`/profile/${single.id}`} key={single.id} className="text-center group">
                        <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-2 border-transparent group-hover:border-primary-blue transition-all duration-300">
                          {single.profile_pic_url ? (
                            <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-background-main flex items-center justify-center">
                              <span className="text-2xl font-bold text-text-light">
                                {single.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-text-dark truncate group-hover:text-primary-blue">{single.name}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-light">Not currently sponsoring any singles.</p>
                )}
              </div>
            )}
            {profile.user_type === 'SINGLE' && matchmakrProfile && (
              <div className="mt-6 border-t border-primary-blue border-opacity-30 pt-4">
                <h2 className="text-lg font-semibold text-primary-blue mb-2">Their MatchMakr</h2>
                <Link href={`/profile/${matchmakrProfile.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-background-main shadow-card hover:shadow-card-hover border border-primary-blue/10 hover:border-primary-blue transition-all duration-300">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light">
                    {matchmakrProfile.profile_pic_url ? (
                      <img src={matchmakrProfile.profile_pic_url} alt={matchmakrProfile.name || 'MatchMakr'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-2xl font-bold text-text-light">
                          {matchmakrProfile.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-dark group-hover:text-primary-blue">{matchmakrProfile.name}</p>
                    <p className="text-xs text-text-light">View MatchMakr Profile</p>
                  </div>
                  {/* Show Message button only if current user is a matchmakr */}
                  {currentUserProfile?.user_type === 'MATCHMAKR' && (
                    <button
                      className="ml-4 px-4 py-2 rounded-md border-2 gradient-border bg-transparent text-primary-blue hover:text-white hover:bg-gradient-primary font-semibold transition-colors"
                      onClick={e => { e.preventDefault(); setIsChatOpen(true); }}
                    >
                      Message
                    </button>
                  )}
                </Link>
                {/* Unified Chat Modal */}
                {isChatOpen && currentUserProfile?.user_type === 'MATCHMAKR' && (
                  <ChatModal
                    open={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    currentUserId={profile.sponsored_by_id || ''}
                    otherUserId={matchmakrProfile.id}
                    otherUserName={matchmakrProfile.name || ''}
                    otherUserProfilePic={matchmakrProfile.profile_pic_url}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileClient; 