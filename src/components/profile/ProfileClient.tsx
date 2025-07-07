"use client";
import React, { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import EditProfileModal from './EditProfileModal';
import EditProfileButton from './EditProfileButton';
import Link from 'next/link';
import { Profile } from './types';
import ChatModal from '../chat/ChatModal';
import InterestsInput from './InterestsInput';

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

// Add Interest type for local use
interface Interest {
  id: number;
  name: string;
}

interface ProfileClientProps {
  profile: Profile;
  sponsoredSingles: SponsoredSingle[] | null;
  matchmakrProfile: MatchmakrProfile | null;
  isOwnProfile: boolean;
  isSponsorViewing: boolean;
  currentUserProfile: { user_type: string } | null;
  currentSponsoredSingle?: { id: string; name: string | null; photo: string | null } | null;
  currentUserName?: string;
  currentUserProfilePic?: string | null;
  currentUserId?: string;
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
  currentSponsoredSingle,
  currentUserName,
  currentUserProfilePic,
  currentUserId,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showInterestsInput, setShowInterestsInput] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const age = calculateAge(profile.birth_year);
  const firstName = profile.name?.split(' ')[0] || '';

  // Fetch interests for this profile on mount
  React.useEffect(() => {
    if (profile.id) {
      setLoadingInterests(true);
      fetch(`/api/profiles/${profile.id}/interests`)
        .then(res => res.json())
        .then(data => setInterests(data.interests || []))
        .finally(() => setLoadingInterests(false));
    }
  }, [profile.id]);

  const handleSaveInterests = async (newInterests: Interest[]) => {
    setSavingInterests(true);
    await fetch(`/api/profiles/${profile.id}/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
    });
    setInterests(newInterests);
    setShowInterestsInput(false);
    setSavingInterests(false);
  };

  return (
    <>
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <PhotoGallery 
          userId={profile.id} 
          photos={profile.photos}
          userType={profile.user_type}
        />
        <div className="p-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
              <p className="text-lg text-white flex items-center">
                <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <path d="M6.5 1h3a1 1 0 0 1 1 1v1h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.5V2a1 1 0 0 1 1-1z" fill="#fff"/>
                    <path d="M6.5 3h3v1h-3V3z" fill="white"/>
                  </svg>
                </span>
                {[profile.occupation, age ? age : null].filter(Boolean).join(', ')}
              </p>
            </div>
            {isOwnProfile && (
              <EditProfileButton profile={profile} />
            )}
          </div>
          {profile.user_type === 'SINGLE' && (profile.city || profile.state || profile.zip_code) && (
            <>
              <p className="text-white mt-1 flex items-center">
                <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <path d="M8 1C5.24 1 3 3.24 3 6c0 2.25 5 9 5 9s5-6.75 5-9c0-2.76-2.24-5-5-5z" fill="#fff" stroke="none"/>
                    <circle cx="8" cy="6" r="2" fill="white"/>
                  </svg>
                </span>
                {[profile.city, profile.state].filter(Boolean).join(', ')}
                {profile.zip_code && ` ${profile.zip_code}`}
              </p>
              {/* Add Interest Button and Interests Badges */}
              {(isOwnProfile || isSponsorViewing) && (
                <div className="mt-2">
                  <button
                    className="bg-white/10 text-white px-4 py-1 rounded-full border border-white/20 hover:bg-white/20 transition-colors text-sm font-semibold"
                    onClick={() => setShowInterestsInput(v => !v)}
                    disabled={loadingInterests || savingInterests}
                  >
                    {showInterestsInput ? 'Cancel' : 'Add Interest'}
                  </button>
                  {showInterestsInput && (
                    <div className="mt-2">
                      <InterestsInput
                        value={interests}
                        onChange={handleSaveInterests}
                        disabled={savingInterests}
                      />
                      <button
                        className="mt-2 px-4 py-1 rounded-full bg-accent-teal-light text-white font-semibold hover:bg-accent-teal transition-colors"
                        onClick={() => handleSaveInterests(interests)}
                        disabled={savingInterests}
                      >
                        Save Interests
                      </button>
                    </div>
                  )}
                  {/* Show current interests as badges */}
                  {!showInterestsInput && interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {interests.slice(0, 8).map(interest => (
                        <span key={interest.id} className="bg-white/20 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                          {interest.name}
                          {(isOwnProfile || isSponsorViewing) && (
                            <button
                              type="button"
                              className="ml-1 text-white/70 hover:text-red-400"
                              onClick={async () => {
                                const newInterests = interests.filter(i => i.id !== interest.id);
                                setSavingInterests(true);
                                await fetch(`/api/profiles/${profile.id}/interests`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
                                });
                                setInterests(newInterests);
                                setSavingInterests(false);
                              }}
                              disabled={savingInterests}
                              aria-label={`Remove ${interest.name}`}
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="mt-6">
            <div className="bg-white/10 rounded-xl border border-white/20 shadow-card p-4">
              <h2 className="text-lg font-semibold text-white">About {firstName}</h2>
              <p className="mt-2 text-sm text-white/90">{profile.bio || 'No bio yet.'}</p>
            </div>
          </div>
          {profile.user_type === 'SINGLE' && (
            <div className="mt-6">
              <div className="bg-white/10 rounded-xl border border-white/20 shadow-card p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">What their MatchMakr says</h2>
                  {isSponsorViewing && (
                    <EditProfileButton profile={profile} canEditEndorsementOnly={true} />
                  )}
                </div>
                <p className="mt-2 text-sm text-white/90">{profile.matchmakr_endorsement || 'This is where your matchmakr writes about you...'}</p>
              </div>
            </div>
          )}
          {profile.user_type === 'MATCHMAKR' && (
            <div className="mt-6 border-t border-white/30 pt-4">
              <h2 className="text-lg font-semibold text-white">Sponsored Singles</h2>
              {sponsoredSingles && sponsoredSingles.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {sponsoredSingles.map(single => (
                    <Link href={`/profile/${single.id}`} key={single.id} className="text-center group">
                      <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-2 border-white group-hover:border-primary-blue transition-all duration-300">
                        {single.profile_pic_url ? (
                          <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-background-main flex items-center justify-center">
                            <span className="text-2xl font-bold text-white/80">
                              {single.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white truncate group-hover:text-primary-blue">{single.name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/80">Not currently sponsoring any singles.</p>
              )}
            </div>
          )}
          {profile.user_type === 'SINGLE' && matchmakrProfile && (
            <div className="mt-6 border-t border-white/30 pt-4">
              <h2 className="text-lg font-semibold text-white mb-2">Their MatchMakr</h2>
              <Link href={`/profile/${matchmakrProfile.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-white/10 shadow-card hover:shadow-card-hover border border-white/20 hover:border-primary-blue transition-all duration-300">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white">
                  {matchmakrProfile.profile_pic_url ? (
                    <img src={matchmakrProfile.profile_pic_url} alt={matchmakrProfile.name || 'MatchMakr'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-background-main flex items-center justify-center">
                      <span className="text-2xl font-bold text-white/80">
                        {matchmakrProfile.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white group-hover:text-primary-blue">{matchmakrProfile.name}</p>
                  <p className="text-xs text-white/80">View MatchMakr Profile</p>
                </div>
                {/* Show Message button only if current user is a matchmakr */}
                {currentUserProfile?.user_type === 'MATCHMAKR' && (
                  <button
                    className="ml-4 px-4 py-2 rounded-md border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
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
                  currentUserId={currentUserId || ''}
                  currentUserName={currentUserName || ''}
                  currentUserProfilePic={currentUserProfilePic || null}
                  otherUserId={matchmakrProfile.id}
                  otherUserName={matchmakrProfile.name || ''}
                  otherUserProfilePic={matchmakrProfile.profile_pic_url}
                  aboutSingleA={{ id: profile.id, name: profile.name || '', photo: profile.photos?.[0] || null }}
                  aboutSingleB={currentSponsoredSingle ? { id: currentSponsoredSingle.id, name: currentSponsoredSingle.name || '', photo: currentSponsoredSingle.photo || null } : { id: '', name: '', photo: null }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileClient; 