"use client";
import React, { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import EditProfileModal from './EditProfileModal';
import IntroductionSignalSection from './IntroductionSignalSection';
import PairingsSection from './PairingsSection';
import Link from 'next/link';
import { Profile } from './types';
import InterestsInput from './InterestsInput';
import SelectSingleModal from '../dashboard/SelectSingleModal';
import InviteSingleModal from '../dashboard/InviteSingleModal';
import EndSponsorshipModal from '../dashboard/EndSponsorshipModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { clearPondCache } from '@/lib/pond-cache';
import { calculateAge } from '@/lib/age';

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
  const [isEditingOccupation, setIsEditingOccupation] = useState(false);
  const [occupationValue, setOccupationValue] = useState(profile.occupation || '');
  const [savingOccupation, setSavingOccupation] = useState(false);
  const [showSelectSingleModal, setShowSelectSingleModal] = useState(false);
  const [showInviteSingleModal, setShowInviteSingleModal] = useState(false);
  const [isEndorsementEditOpen, setIsEndorsementEditOpen] = useState(false);
  const [showEndSponsorshipModal, setShowEndSponsorshipModal] = useState(false);
  const [endingSponsorship, setEndingSponsorship] = useState(false);
  const age = calculateAge(profile);
  const firstName = profile.name?.split(' ')[0] || '';
  const router = useRouter();
  const { orbitRole } = useAuth();
  const supabase = createClient();
  
  // In Orbit, only MATCHMAKR (Sponsors) can edit profiles
  // Singles viewing their own profile should see read-only view
  const canEditProfile = orbitRole === 'MATCHMAKR' && (isOwnProfile || isSponsorViewing);
  
  // Structure sponsors as an array to support multiple sponsors in the future
  // Currently, the schema only supports one sponsor, but this structure makes it easy to extend
  const sponsors = matchmakrProfile ? [{
    id: matchmakrProfile.id,
    name: matchmakrProfile.name,
    profile_pic_url: matchmakrProfile.profile_pic_url,
    endorsement: profile.matchmakr_endorsement, // Currently one endorsement field, but could be per-sponsor in future
    isCurrentSponsor: isSponsorViewing
  }] : [];

  // Explicit booleans for sponsor-authored sections visibility and edit permissions
  // Only the sponsor-of-record (assigned to this single) can edit sponsor-authored sections
  const isSponsorOfThisSingle = 
    orbitRole === 'MATCHMAKR' &&
    profile.user_type === 'SINGLE' &&
    sponsors.length > 0 &&
    sponsors.some(sponsor => sponsor.isCurrentSponsor === true);
  
  const isViewingOwnSingleProfile = 
    isOwnProfile && 
    profile.user_type === 'SINGLE' && 
    orbitRole === 'SINGLE';

  // Guardrail: log if there's a mismatch between isSponsorViewing and isSponsorOfThisSingle
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (isSponsorViewing && profile.user_type === 'SINGLE' && orbitRole === 'MATCHMAKR' && !isSponsorOfThisSingle) {
      console.error('[ProfileClient] Access control inconsistency: isSponsorViewing is true but isSponsorOfThisSingle is false', {
        isSponsorViewing,
        isSponsorOfThisSingle,
        sponsors: sponsors.map(s => ({ id: s.id, isCurrentSponsor: s.isCurrentSponsor })),
        orbitRole,
        profileUserType: profile.user_type,
      });
    }
  }
  
  // Debug: Track canEditProfile changes (only log when false to help diagnose issues)
  React.useEffect(() => {
    if (canEditProfile === false && (isOwnProfile || isSponsorViewing)) {
      console.log('ProfileClient: canEditProfile is false (expected true)', {
        orbitRole,
        isOwnProfile,
        isSponsorViewing,
        canEditProfile,
        userType: profile.user_type
      });
    }
  }, [orbitRole, isOwnProfile, isSponsorViewing, canEditProfile, profile.user_type]);
  
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

  const handleSaveOccupation = async () => {
    const trimmed = occupationValue.trim().slice(0, 50);
    setIsEditingOccupation(false);
    if (trimmed === (profile.occupation || '')) return;
    setSavingOccupation(true);
    await supabase
      .from('profiles')
      .update({ occupation: trimmed || null })
      .eq('id', profile.id);
    setSavingOccupation(false);
  };

  const handleSaveInterests = async (newInterests: Interest[]) => {
    setSavingInterests(true);
    const response = await fetch(`/api/profiles/${profile.id}/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
    });
    if (response.ok) {
      clearPondCache();
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

  // Handler for "Message as sponsor" - navigates to sponsor-to-single chat route
  const handleMessageAsSponsor = () => {
    router.push(`/dashboard/chat/single/${profile.id}`);
  };

  // Handler for ending sponsorship
  const handleEndSponsorship = async () => {
    setEndingSponsorship(true);
    try {
      const { error } = await supabase.functions.invoke('end-sponsorship', {
        body: { single_id: profile.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Navigate to sponsor dashboard and refresh to show updated state
      window.location.href = '/dashboard/matchmakr';
    } catch (error: any) {
      console.error('Error ending sponsorship:', error);
      alert(`The sponsorship couldn't be ended. Please try again.`);
      setEndingSponsorship(false);
      setShowEndSponsorshipModal(false);
    }
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
            occupation={isViewingOwnSingleProfile ? null : profile.occupation}
          />
        </div>

        {/* Mobile occupation row — visible only below md, hidden on desktop where the identity block handles it */}
        {profile.user_type === 'SINGLE' && (
          <div className="md:hidden px-4 pt-1">
            {isViewingOwnSingleProfile ? (
              isEditingOccupation ? (
                <input
                  type="text"
                  value={occupationValue}
                  onChange={e => setOccupationValue(e.target.value.slice(0, 50))}
                  onBlur={handleSaveOccupation}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSaveOccupation(); }
                    if (e.key === 'Escape') { setOccupationValue(profile.occupation || ''); setIsEditingOccupation(false); }
                  }}
                  className="text-sm text-orbit-text bg-orbit-surface border border-orbit-border rounded px-2 py-0.5 w-48 focus:outline-none focus:border-orbit-gold"
                  autoFocus
                  disabled={savingOccupation}
                  maxLength={50}
                />
              ) : occupationValue ? (
                <button
                  className="flex items-center gap-1 text-sm text-orbit-text2 hover:text-orbit-text transition-colors"
                  onClick={() => setIsEditingOccupation(true)}
                >
                  {occupationValue}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-orbit-muted shrink-0" aria-hidden>
                    <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12H3v-2L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : (
                <button
                  className="flex items-center gap-1 text-sm text-orbit-muted hover:text-orbit-text transition-colors"
                  onClick={() => setIsEditingOccupation(true)}
                >
                  + Add occupation
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
                    <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12H3v-2L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )
            ) : (
              profile.occupation && (
                <p className="text-sm text-orbit-text2">{profile.occupation}</p>
              )
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* Primary Identity Block */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-orbit-text">{profile.name}</h1>
                  {age && (
                    <p className="text-lg text-orbit-text mt-1">{age}</p>
                  )}
                  {isViewingOwnSingleProfile ? (
                    isEditingOccupation ? (
                      <input
                        type="text"
                        value={occupationValue}
                        onChange={e => setOccupationValue(e.target.value.slice(0, 50))}
                        onBlur={handleSaveOccupation}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveOccupation(); }
                          if (e.key === 'Escape') { setOccupationValue(profile.occupation || ''); setIsEditingOccupation(false); }
                        }}
                        className="mt-1 text-sm text-orbit-text bg-orbit-surface border border-orbit-border rounded px-2 py-0.5 w-48 focus:outline-none focus:border-orbit-gold"
                        autoFocus
                        disabled={savingOccupation}
                        maxLength={50}
                      />
                    ) : occupationValue ? (
                      <p
                        className="text-sm text-orbit-text2 mt-1 cursor-pointer hover:text-orbit-text transition-colors"
                        onClick={() => setIsEditingOccupation(true)}
                        title="Click to edit"
                      >
                        {occupationValue}
                      </p>
                    ) : (
                      <button
                        className="mt-1 text-sm text-orbit-muted hover:text-orbit-text transition-colors"
                        onClick={() => setIsEditingOccupation(true)}
                      >
                        + Add occupation
                      </button>
                    )
                  ) : (
                    profile.occupation && (
                      <p className="text-sm text-orbit-text2 mt-1">{profile.occupation}</p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Helper Note - only for single viewing own profile */}
          {isOwnProfile && profile.user_type === 'SINGLE' && orbitRole === 'SINGLE' && (
            <div className="text-sm text-orbit-muted italic">
              Your Sponsor manages your Orbit profile. If something looks off, chat with them.
            </div>
          )}

          {/* Sponsor Note - only for SINGLE profiles with sponsors */}
          {profile.user_type === 'SINGLE' && sponsors.length > 0 && (
            <>
              {sponsors.map((sponsor) => {
                const endorsementBlank = !sponsor.endorsement || sponsor.endorsement.trim() === '';
                if (endorsementBlank && !isSponsorOfThisSingle && !isViewingOwnSingleProfile) {
                  return null;
                }
                return (
                  <div key={sponsor.id}>
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-orbit-text text-base font-semibold">
                        From {profile.name || 'this person'}'s sponsor
                      </h2>
                      {isSponsorOfThisSingle && (
                        <button
                          onClick={() => setIsEndorsementEditOpen(true)}
                          className="orbit-btn-secondary px-3 py-1 rounded-full text-sm font-medium"
                          aria-label="Edit endorsement"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="relative pt-2 pb-2 pl-4 pr-4 mb-4">
                      <span
                        aria-hidden
                        className="pointer-events-none select-none absolute left-0 top-0 text-orbit-muted text-3xl leading-none"
                        style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
                      >
                        "
                      </span>
                      <p className={sponsor.endorsement ? "text-orbit-text2 text-base font-normal leading-relaxed" : "text-orbit-muted text-base font-normal leading-relaxed"}>
                        {sponsor.endorsement || 'This is where your sponsor writes about you...'}
                      </p>
                      <span
                        aria-hidden
                        className="pointer-events-none select-none absolute right-0 bottom-0 text-orbit-muted text-3xl leading-none"
                        style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
                      >
                        "
                      </span>
                    </div>
                    <div className="border-t border-orbit-border/50"></div>
                  </div>
                );
              })}
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

          {/* Pairings Section - only for SINGLE profiles */}
          {profile.user_type === 'SINGLE' && (
            <PairingsSection
              profileId={profile.id}
              pairingsSignal={profile.pairings_signal}
              canEdit={isSponsorOfThisSingle}
              viewerIsProfileOwner={isViewingOwnSingleProfile}
            />
          )}

          {/* Introduction Signal Section - only for SINGLE profiles */}
          {profile.user_type === 'SINGLE' && (
            <IntroductionSignalSection
              introductionSignal={profile.introduction_signal}
              firstName={firstName}
              profileId={profile.id}
              profileName={profile.name}
              canEdit={isSponsorOfThisSingle}
              viewerIsProfileOwner={isViewingOwnSingleProfile}
            />
          )}

          {/* Interests Block */}
          {profile.user_type === 'SINGLE' && (
            <>
              {interests.length === 0 && !isSponsorOfThisSingle && !isViewingOwnSingleProfile ? null : (
                <div>
                  <div className="text-orbit-text2 text-base font-semibold mb-2">Interests</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!showInterestsInput && interests.slice(0, 6).map(interest => (
                      <span key={interest.id} className="orbit-surface-soft px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 text-orbit-text">
                        {interest.name}
                        {(canEditProfile || isViewingOwnSingleProfile) && (
                          <button
                            type="button"
                            className="ml-1 text-orbit-text2 hover:text-orbit-warning transition-colors"
                            onClick={async () => {
                              const newInterests = interests.filter(i => i.id !== interest.id);
                              setSavingInterests(true);
                              const response = await fetch(`/api/profiles/${profile.id}/interests`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ interestIds: newInterests.map(i => i.id) })
                              });
                              if (response.ok) {
                                clearPondCache();
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
                    {(canEditProfile || isViewingOwnSingleProfile) && (
                      <button
                        className="orbit-btn-secondary px-3 py-1 rounded-full text-xs font-semibold"
                        onClick={() => setShowInterestsInput(v => !v)}
                        disabled={loadingInterests || savingInterests}
                      >
                        {showInterestsInput ? 'Cancel' : '+ Add'}
                      </button>
                    )}
                  </div>
                  {showInterestsInput && (canEditProfile || isViewingOwnSingleProfile) && (
                    <div className="mt-2">
                      <InterestsInput
                        value={interests}
                        onChange={handleSaveInterests}
                        disabled={savingInterests}
                      />
                      <button
                        className="orbit-btn-secondary mt-2 px-4 py-1 rounded-full font-semibold"
                        onClick={() => handleSaveInterests(interests)}
                        disabled={savingInterests}
                      >
                        Save Interests
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Sponsored Singles Section - only for MATCHMAKR profiles */}
          {profile.user_type === 'MATCHMAKR' && (
            <div className="border-t border-orbit-border/30 pt-4">
              <h2 className="text-lg font-semibold text-orbit-text">Sponsored Singles</h2>
              {sponsoredSingles && sponsoredSingles.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {sponsoredSingles.map(single => (
                    <Link href={`/profile/${single.id}`} key={single.id} className="text-center group">
                      <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-2 border-orbit-border group-hover:border-orbit-gold transition-all duration-300">
                        {single.profile_pic_url ? (
                          <img src={single.profile_pic_url} alt={single.name || 'Single'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-orbit-canvas flex items-center justify-center">
                            <span className="text-2xl font-bold text-orbit-text">
                              {single.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-orbit-text truncate">{single.name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-orbit-muted">Not currently sponsoring any singles.</p>
              )}
            </div>
          )}

          {/* Sponsor Block - only for SINGLE profiles with matchmakrProfile */}
          {profile.user_type === 'SINGLE' && matchmakrProfile && (
            <>
              {/* Show "Profile managed by" when viewer is NOT the sponsor */}
              {!isSponsorViewing && (
                <div className="border-t border-orbit-border/30 mt-6">
                  <div className="px-4 py-4">
                    <div className="text-orbit-text font-semibold mb-1">Profile managed by</div>
                    <div className="text-orbit-muted text-xs mb-3">Trusted contact for this profile</div>
                    <div className="mt-3 rounded-xl border border-orbit-border/30 bg-orbit-surface-1/20 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-orbit-border/30 shrink-0">
                          {matchmakrProfile.profile_pic_url ? (
                            <img src={matchmakrProfile.profile_pic_url} alt={matchmakrProfile.name || 'Sponsor'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-orbit-surface-1/40 flex items-center justify-center">
                              <span className="text-xl font-bold text-orbit-text">
                                {matchmakrProfile.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-orbit-text font-semibold text-base leading-tight truncate">{matchmakrProfile.name}</div>
                          <Link href={`/profile/${matchmakrProfile.id}`} className="text-orbit-text2 hover:text-orbit-text text-xs whitespace-nowrap transition-colors">
                            View profile
                          </Link>
                        </div>
                      </div>
                      {currentUserProfile?.user_type === 'MATCHMAKR' && (
                        <button
                          className="orbit-btn-secondary shrink-0 px-5 py-2 text-sm rounded-full font-semibold active:scale-95"
                          onClick={e => { e.preventDefault(); handleOpenChat(); }}
                        >
                          Message
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show "Sponsor tools" when viewer IS the sponsor */}
              {isSponsorViewing && (
                <div className="border-t border-orbit-border/30 mt-6">
                  <div className="px-4 py-4">
                    <div className="text-orbit-text text-base font-semibold mb-1">Sponsor-only actions</div>
                    <div className="text-orbit-text2 text-xs font-medium opacity-70 mb-3">Only you can do these.</div>
                    <div className="mt-3 rounded-xl border border-orbit-border/30 bg-orbit-surface-1/20">
                      {/* Message your single row */}
                      <button
                        onClick={handleMessageAsSponsor}
                        className="w-full flex items-center justify-between py-3 px-4 border-b border-orbit-border/30 hover:bg-orbit-surface-1/20 transition-colors text-left"
                      >
                        <span className="text-orbit-text font-medium">Message your single{profile.name ? `, ${profile.name}` : ''}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orbit-muted">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                      {/* End sponsorship row - danger style */}
                      <button
                        onClick={() => setShowEndSponsorshipModal(true)}
                        disabled={endingSponsorship}
                        className="w-full flex items-center justify-between py-3 px-4 hover:bg-orbit-surface-1/20 transition-colors text-left disabled:opacity-50"
                      >
                        <span className="text-orbit-warning font-medium">End sponsorship</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orbit-warning">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

              {/* End Sponsorship Modal */}
              <EndSponsorshipModal
                isOpen={showEndSponsorshipModal}
                onClose={() => setShowEndSponsorshipModal(false)}
                onConfirm={handleEndSponsorship}
                singleName={profile.name || undefined}
                isSponsorView={true}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileClient; 