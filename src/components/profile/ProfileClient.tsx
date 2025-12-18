"use client";
import React, { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import EditProfileModal from './EditProfileModal';
import EditProfileButton from './EditProfileButton';
import Link from 'next/link';
import { Profile } from './types';
import InterestsInput from './InterestsInput';
import SelectSingleModal from '../dashboard/SelectSingleModal';
import InviteSingleModal from '../dashboard/InviteSingleModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PencilIcon } from '@heroicons/react/24/solid';

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
  currentUserSponsoredSingles?: { id: string; name: string | null; photo: string | null }[];
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
  currentUserSponsoredSingles,
}) => {
  const [savingInterests, setSavingInterests] = useState(false);
  const [showInterestsInput, setShowInterestsInput] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [showSelectSingleModal, setShowSelectSingleModal] = useState(false);
  const [showInviteSingleModal, setShowInviteSingleModal] = useState(false);
  const [isEndorsementEditOpen, setIsEndorsementEditOpen] = useState(false);
  const age = calculateAge(profile.birth_year);
  const firstName = profile.name?.split(' ')[0] || '';
  const router = useRouter();
  const { orbitRole } = useAuth();
  
  // In Orbit, only MATCHMAKR (Sponsors) can edit profiles
  // Singles viewing their own profile should see read-only view
  const canEditProfile = orbitRole === 'MATCHMAKR' && (isOwnProfile || isSponsorViewing);
  
  // Singles can edit their own basic info (name, occupation, location) but not bio
  const canEditBasicInfo = orbitRole === 'SINGLE' && isOwnProfile && profile.user_type === 'SINGLE';

  // Structure sponsors as an array to support multiple sponsors in the future
  // Currently, the schema only supports one sponsor, but this structure makes it easy to extend
  const sponsors = matchmakrProfile ? [{
    id: matchmakrProfile.id,
    name: matchmakrProfile.name,
    profile_pic_url: matchmakrProfile.profile_pic_url,
    endorsement: profile.matchmakr_endorsement, // Currently one endorsement field, but could be per-sponsor in future
    isCurrentSponsor: isSponsorViewing
  }] : [];

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
    const response = await fetch(`/api/profiles/${profile.id}/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
    });
    if (response.ok) {
      // Invalidate pond cache after successful interests save
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pond_cache');
      }
    }
    setInterests(newInterests);
    setShowInterestsInput(false);
    setSavingInterests(false);
  };

  // MVP assumption: each SINGLE has exactly one sponsor (profiles.sponsored_by_id).
  // Multi-sponsor support will require revisiting sponsor selection UI + conversation uniqueness.
  
  // Handler to open chat with single selection modal (matches pond flow)
  const handleOpenChat = () => {
    if (matchmakrProfile?.id) {
      // Show SelectSingleModal to allow user to choose which single the chat is about
      setShowSelectSingleModal(true);
    }
  };

  // Handler for when "Someone Else!" is clicked in SelectSingleModal - triggers invite flow
  const handleInviteSingle = () => {
    setShowSelectSingleModal(false);
    setShowInviteSingleModal(true);
  };

  // Fallback handler (should not be called if SelectSingleModal props are correct)
  // SelectSingleModal handles chat creation internally when currentUserId, otherUserId, clickedSingleId are provided
  const handleSingleSelected = (singleId: string) => {
    // This should not be reached in normal flow since SelectSingleModal handles navigation internally
    console.warn('handleSingleSelected called - this indicates SelectSingleModal props may be missing');
  };

  return (
    <>
      <div className="min-h-screen pt-0 pb-4 px-4 sm:p-6 md:p-8">
        <div className="-mx-4 sm:mx-0">
          <PhotoGallery 
            userId={profile.id} 
            photos={profile.photos}
            userType={profile.user_type}
            canEdit={canEditProfile}
            profileName={profile.name}
            name={profile.name}
            age={age}
          />
        </div>
        <div className="space-y-6">
          {/* Primary Identity Block */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                  {age && (
                    <p className="text-lg text-white mt-1">{age}</p>
                  )}
                  {profile.user_type === 'SINGLE' && (profile.city || profile.state || profile.zip_code) && (
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
                  )}
                  {profile.occupation && (
                    <p className="text-lg text-white mt-1 flex items-center">
                      <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M6.5 1h3a1 1 0 0 1 1 1v1h2.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.5V2a1 1 0 0 1 1-1z" fill="#fff"/>
                          <path d="M6.5 3h3v1h-3V3z" fill="white"/>
                        </svg>
                      </span>
                      {profile.occupation}
                    </p>
                  )}
                </div>
                {canEditBasicInfo && (
                  <div className="ml-4">
                    <EditProfileButton profile={profile} singleBasicInfoOnly={true} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Helper Note - only for single viewing own profile */}
          {isOwnProfile && profile.user_type === 'SINGLE' && orbitRole === 'SINGLE' && (
            <div className="text-sm text-white/70 italic">
              Your Sponsor manages your Orbit profile. If something looks off, chat with them.
            </div>
          )}

          {/* Interests Block */}
          {profile.user_type === 'SINGLE' && (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Interest chips - hide when input is open to avoid duplication */}
                {!showInterestsInput && interests.slice(0, 8).map(interest => (
                  <span key={interest.id} className="bg-white/20 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    {interest.name}
                    {canEditProfile && (
                      <button
                        type="button"
                        className="ml-1 text-white/70 hover:text-red-400"
                        onClick={async () => {
                          const newInterests = interests.filter(i => i.id !== interest.id);
                          setSavingInterests(true);
                          const response = await fetch(`/api/profiles/${profile.id}/interests`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
                          });
                          if (response.ok) {
                            // Invalidate pond cache after successful interests deletion
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('pond_cache');
                            }
                          }
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
                {/* Add Interest chip */}
                {canEditProfile && (
                  <button
                    className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-white/80 text-xs font-semibold hover:bg-white/10"
                    onClick={() => setShowInterestsInput(v => !v)}
                    disabled={loadingInterests || savingInterests}
                  >
                    {showInterestsInput ? 'Cancel' : '+ Add'}
                  </button>
                )}
              </div>
              {/* InterestsInput when expanded */}
              {showInterestsInput && canEditProfile && (
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
            </div>
          )}

          {/* Endorsement Block - only for SINGLE profiles with sponsors */}
          {profile.user_type === 'SINGLE' && sponsors.length > 0 && (
            <>
              {sponsors.map((sponsor) => (
                <div key={sponsor.id}>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-white/90 font-semibold">
                        What {sponsor.name || 'their Sponsor'} says about {firstName || profile.name || 'them'}
                      </h2>
                      {sponsor.isCurrentSponsor && (
                        <button
                          onClick={() => setIsEndorsementEditOpen(true)}
                          className="ml-3 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                          aria-label="Edit endorsement"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-white/80 text-sm leading-relaxed">{sponsor.endorsement || 'This is where your sponsor writes about you...'}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Endorsement Edit Modal */}
          {isEndorsementEditOpen && (
            <EditProfileModal
              profile={profile}
              onClose={() => setIsEndorsementEditOpen(false)}
              onSave={() => {
                setIsEndorsementEditOpen(false);
                window.location.reload();
              }}
              canEditEndorsementOnly={true}
            />
          )}

          {/* Sponsored Singles Section - only for MATCHMAKR profiles */}
          {profile.user_type === 'MATCHMAKR' && (
            <div className="border-t border-white/30 pt-4">
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
                      <p className="mt-2 text-sm font-semibold text-white truncate">{single.name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/80">Not currently sponsoring any singles.</p>
              )}
            </div>
          )}

          {/* Sponsor Block - only for SINGLE profiles with matchmakrProfile */}
          {profile.user_type === 'SINGLE' && matchmakrProfile && (
            <div className="border-t border-white/10 mt-6">
              <div className="px-4 py-4">
                <div className="text-white/90 font-semibold mb-3">Their Sponsor</div>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0">
                      {matchmakrProfile.profile_pic_url ? (
                        <img src={matchmakrProfile.profile_pic_url} alt={matchmakrProfile.name || 'Sponsor'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-xl font-bold text-white/80">
                            {matchmakrProfile.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-base leading-tight truncate">{matchmakrProfile.name}</div>
                      <Link href={`/profile/${matchmakrProfile.id}`} className="text-white/60 text-xs hover:text-white/80 whitespace-nowrap">
                        View profile
                      </Link>
                    </div>
                  </div>
                  {/* Show Message button only if current user is a matchmakr */}
                  {currentUserProfile?.user_type === 'MATCHMAKR' && (
                    <button
                      className="shrink-0 px-5 py-2 text-sm rounded-full bg-white text-primary-blue font-semibold hover:bg-white/90 active:scale-95 transition shadow-md shadow-black/20"
                      onClick={e => { e.preventDefault(); handleOpenChat(); }}
                    >
                      Message
                    </button>
                  )}
                  </div>
                </div>
              </div>
              {/* Select Single Modal - handles chat creation via chat-context API */}
              <SelectSingleModal
                open={showSelectSingleModal}
                onClose={() => setShowSelectSingleModal(false)}
                sponsoredSingles={currentUserSponsoredSingles || []}
                onSelectSingle={handleSingleSelected}
                otherMatchmakrName={matchmakrProfile?.name || 'this Sponsor'}
                currentUserId={currentUserId}
                otherUserId={matchmakrProfile?.id}
                clickedSingleId={profile.id}
                onInviteSingle={handleInviteSingle}
              />

              {/* Invite Single Modal - shown when "Someone Else!" is selected */}
              <InviteSingleModal
                open={showInviteSingleModal}
                onClose={() => setShowInviteSingleModal(false)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileClient; 