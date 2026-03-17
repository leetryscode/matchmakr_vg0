"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatModal from '@/components/chat/ChatModal';
import { getSupabaseClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InviteMatchMakrModal from '@/components/dashboard/InviteMatchMakrModal';
import InviteSingleReferralModal from '@/components/dashboard/InviteSingleReferralModal';
import EndSponsorshipModal from './EndSponsorshipModal';
import NotificationsSection from '@/components/dashboard/NotificationsSection';
import PreviewCardsSection from '@/components/dashboard/PreviewCardsSection';
import SectionHeader from '@/components/ui/SectionHeader';
import PreviewRow from '@/components/ui/PreviewRow';
import InviteSingleReferralRow from '@/components/ui/InviteSingleReferralRow';
import GlassCard from '@/components/ui/GlassCard';
import PrimaryCTA from '@/components/ui/PrimaryCTA';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import TrustLockup from '@/components/dashboard/TrustLockup';
import AvailabilitySection from '@/components/dashboard/AvailabilitySection';
import Toast from '@/components/ui/Toast';
import { computeSingleStatus, SingleStatus } from '@/lib/status/singleStatus';
import MyCommunitiesSection from '@/components/dashboard/MyCommunitiesSection';

/** Get initials from name for avatar fallback (e.g. "Lee Smith" → "LS", "Lee" → "L") */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface PendingSponsorshipRequest {
  id: string;
  sponsor_id: string;
  status: string;
  invite_id: string | null;
  created_at: string;
}

interface SingleDashboardClientProps {
  userId: string;
  userName: string;
  userProfilePic: string | null;
  sponsor: { id: string; name: string | null; profile_pic_url: string | null } | null;
  userPhotos: string[];
  pausedAt: string | null;
  onboardedAt: string | null;
  photos: (string | null)[] | null;
  matchmakrEndorsement: string | null;
  approvedMatchCount: number;
  pendingSponsorshipRequests?: PendingSponsorshipRequest[];
  sponsorNameMap?: Record<string, string>;
  sponsorPhotoMap?: Record<string, string | null>;
}

const SingleDashboardClient: React.FC<SingleDashboardClientProps> = ({ 
  userId, 
  userName, 
  userProfilePic, 
  sponsor, 
  userPhotos,
  pausedAt,
  onboardedAt,
  photos,
  matchmakrEndorsement,
  approvedMatchCount,
  pendingSponsorshipRequests = [],
  sponsorNameMap = {},
  sponsorPhotoMap = {},
}) => {
  // Compute status for availability section
  const computedStatus = computeSingleStatus({
    paused_at: pausedAt,
    onboarded_at: onboardedAt,
    photos: photos,
    matchmakr_endorsement: matchmakrEndorsement,
    approved_match_count: approvedMatchCount
  });
  
  // Never show INVITED to singles - convert to NEEDS_ATTENTION
  // (un-onboarded users need to complete setup, not see "Available")
  const displayStatus: SingleStatus = computedStatus === 'INVITED' ? 'NEEDS_ATTENTION' : computedStatus;
  const [openChat, setOpenChat] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [singleChats, setSingleChats] = useState<any[]>([]);
  const [selectedSingle, setSelectedSingle] = useState<any | null>(null);
  const [menuOpenIdx, setMenuOpenIdx] = useState<number | null>(null);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [unmatchTarget, setUnmatchTarget] = useState<any | null>(null);
  const [sponsorLastMessage, setSponsorLastMessage] = useState<string>('');
  const [sponsorTimestamp, setSponsorTimestamp] = useState<string>('');
  const [sponsorUnreadCount, setSponsorUnreadCount] = useState<number>(0);
  const [sponsorMenuOpen, setSponsorMenuOpen] = useState(false);
  const [showEndSponsorshipModal, setShowEndSponsorshipModal] = useState(false);
  const [endingSponsorship, setEndingSponsorship] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingSponsorshipRequest[]>(pendingSponsorshipRequests);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setPendingRequests(pendingSponsorshipRequests);
  }, [pendingSponsorshipRequests]);
  const menuRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sponsorMenuRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null); // Track channel to prevent double-subscribe
  const instanceIdRef = useRef<string>(`single-dashboard-${Math.random().toString(36).substr(2, 9)}`);
  const router = useRouter();
  
  // Modal states for both sponsored and unsponsored flows
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviteSponsorOpen, setIsInviteSponsorOpen] = useState(false);
  const [isInviteSingleReferralOpen, setIsInviteSingleReferralOpen] = useState(false);

  // Refactor fetchMatches to be callable - wrapped in useCallback for stable reference
  const fetchMatches = useCallback(async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`single_a_id.eq.${userId},single_b_id.eq.${userId}`)
      .eq('matchmakr_a_approved', true)
      .eq('matchmakr_b_approved', true);
    if (!matches) return;
    // Find the other single's id for each match
    const otherSingleIds = matches.map((m: any) => m.single_a_id === userId ? m.single_b_id : m.single_a_id);
    if (otherSingleIds.length === 0) return setSingleChats([]);
    // Fetch profiles for all other singles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', otherSingleIds);
    // Fetch last message and unread count for each match
    const lastMessages: Record<string, { content: string; created_at: string }> = {};
    const unreadCounts: Record<string, number> = {};
    for (const otherId of otherSingleIds) {
      // Last message
      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (messages && messages.length > 0) {
        lastMessages[otherId] = messages[0];
      }
      // Unread count (where recipient is current user and read is false)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', otherId)
        .eq('recipient_id', userId)
        .eq('read', false);
      unreadCounts[otherId] = count || 0;
    }
    // Map: id -> profile
    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p; });
    // Compose chat rows
    const chatRows = matches.map((m: any) => {
      const otherId = m.single_a_id === userId ? m.single_b_id : m.single_a_id;
      const otherProfile = profileMap[otherId];
      return {
        match: m,
        otherSingle: otherProfile ? {
          id: otherProfile.id,
          name: otherProfile.name,
          photo: otherProfile.photos && otherProfile.photos.length > 0 ? otherProfile.photos[0] : null
        } : null,
        lastMessage: lastMessages[otherId] || null,
        unreadCount: unreadCounts[otherId] || 0
      };
    }).filter(row => row.otherSingle);
    setSingleChats(chatRows);
  }, [userId, supabase]); // Stable dependencies

  useEffect(() => {
    fetchMatches();
  }, [userId, fetchMatches]); // Added fetchMatches to dependencies

  // Real-time subscription for matches
  useEffect(() => {
    if (!userId) return;
    
    const channelName = `matches-${userId}`;
    const instanceId = instanceIdRef.current;
    
    console.log(`[REALTIME-DEBUG] ${instanceId} | SingleDashboardClient | SUBSCRIBE | channel: ${channelName}`);
    
    // Cleanup previous channel if exists (guard against double-subscribe)
    if (channelRef.current) {
      console.log(`[REALTIME-DEBUG] ${instanceId} | SingleDashboardClient | CLEANUP-PREV | channel: ${channelName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, payload => {
        const newMatch = payload.new;
        // Check if this match involves the current user and both matchmakrs have approved
        if ((newMatch.single_a_id === userId || newMatch.single_b_id === userId) && 
            newMatch.matchmakr_a_approved && newMatch.matchmakr_b_approved) {
          // Refresh matches to show the new approved match
          fetchMatches();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, payload => {
        const updatedMatch = payload.new;
        // Check if this match involves the current user and both matchmakrs have approved
        if ((updatedMatch.single_a_id === userId || updatedMatch.single_b_id === userId) && 
            updatedMatch.matchmakr_a_approved && updatedMatch.matchmakr_b_approved) {
          // Refresh matches to show the newly approved match
          fetchMatches();
        }
      })
      .subscribe((status) => {
        console.log(`[REALTIME-DEBUG] ${instanceId} | SingleDashboardClient | SUBSCRIBE-STATUS | channel: ${channelName} | status: ${status}`);
      });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        console.log(`[REALTIME-DEBUG] ${instanceId} | SingleDashboardClient | CLEANUP | channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchMatches, supabase]); // Added fetchMatches for stable closure

  // Fetch sponsor chat info
  useEffect(() => {
    if (!sponsor) return;
    const fetchSponsorChat = async () => {
      // Last message
      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${sponsor.id}),and(sender_id.eq.${sponsor.id},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (messages && messages.length > 0) {
        setSponsorLastMessage(messages[0].content);
        setSponsorTimestamp(new Date(messages[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setSponsorLastMessage('Click to chat');
        setSponsorTimestamp('');
      }
      // Unread count (where sponsor is sender and user is recipient and read is false)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', sponsor.id)
        .eq('recipient_id', userId)
        .eq('read', false);
      setSponsorUnreadCount(count || 0);
    };
    fetchSponsorChat();
  }, [userId, sponsor]);

  // Close menus on outside click/touch
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      // For singles
      if (menuOpenIdx !== null) {
        const menuEl = menuRefs.current[menuOpenIdx];
        if (menuEl && !menuEl.contains(event.target as Node)) {
          setMenuOpenIdx(null);
        }
      }
      // For sponsor
      if (sponsorMenuOpen) {
        if (sponsorMenuRef.current && !sponsorMenuRef.current.contains(event.target as Node)) {
          setSponsorMenuOpen(false);
        }
      }
    }
    if (menuOpenIdx !== null || sponsorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpenIdx, sponsorMenuOpen]);

  const handleOpenSingleChat = (row: any) => {
    setSelectedSingle(row);
    setOpenChat(true);
  };

  const handleUnmatch = async () => {
    if (!unmatchTarget) return;
    // Delete the match from the DB
    await supabase.from('matches').delete().eq('id', unmatchTarget.match.id);
    // Optionally, delete chat history:
    await supabase.from('messages').delete().or(`and(sender_id.eq.${userId},recipient_id.eq.${unmatchTarget.otherSingle.id}),and(sender_id.eq.${unmatchTarget.otherSingle.id},recipient_id.eq.${userId})`);
    setShowUnmatchModal(false);
    setUnmatchTarget(null);
    // Refresh the matches list
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`single_a_id.eq.${userId},single_b_id.eq.${userId}`)
      .eq('matchmakr_a_approved', true)
      .eq('matchmakr_b_approved', true);
    if (!matches) return setSingleChats([]);
    const otherSingleIds = matches.map((m: any) => m.single_a_id === userId ? m.single_b_id : m.single_a_id);
    if (otherSingleIds.length === 0) return setSingleChats([]);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', otherSingleIds);
    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p; });
    const chatRows = matches.map((m: any) => {
      const otherId = m.single_a_id === userId ? m.single_b_id : m.single_a_id;
      const otherProfile = profileMap[otherId];
      return {
        match: m,
        otherSingle: otherProfile ? {
          id: otherProfile.id,
          name: otherProfile.name,
          photo: otherProfile.photos && otherProfile.photos.length > 0 ? otherProfile.photos[0] : null
        } : null
      };
    }).filter(row => row.otherSingle);
    setSingleChats(chatRows);
  };

  const handleRemoveSponsor = async () => {
    try {
      const { error } = await supabase.functions.invoke('end-sponsorship');
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEndSponsorship = async () => {
    setEndingSponsorship(true);
    try {
      const { error } = await supabase.functions.invoke('end-sponsorship');
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (error: any) {
      console.error('Error ending sponsorship:', error);
      alert(`Error ending sponsorship: ${error.message}`);
    } finally {
      setEndingSponsorship(false);
    }
  };

  const handleAcceptSponsorship = async (requestId: string) => {
    setRequestActionLoading(requestId);
    try {
      const { data, error } = await supabase.rpc('accept_sponsorship_request', { p_request_id: requestId });
      if (error) throw new Error(error.message);
      if (data?.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        router.refresh();
      }
    } catch (err: unknown) {
      console.error('Error accepting sponsorship:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleDeclineSponsorship = async (requestId: string) => {
    setRequestActionLoading(requestId);
    try {
      const { data, error } = await supabase.rpc('decline_sponsorship_request', { p_request_id: requestId });
      if (error) throw new Error(error.message);
      if (data?.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        setToast({ message: 'Declined', type: 'success' });
        router.refresh();
      }
    } catch (err: unknown) {
      console.error('Error declining sponsorship:', err);
      alert(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setRequestActionLoading(null);
    }
  };

  // Profile section at the top with Trust Lockup
  const ProfileSection = () => (
    <div className="flex flex-col">
      {/* Personalized greeting */}
      <div className="text-left self-start mb-4">
        <h1 className="type-display" style={{ fontWeight: 'var(--orbit-font-weight-heading)' }}>Hello, {userName?.split(' ')[0] || 'there'}</h1>
      </div>
      {/* Trust Lockup: Single + Sponsor relationship */}
      <TrustLockup
        primaryAvatarUrl={userProfilePic}
        primaryName={userName}
        primaryId={userId}
        secondaryAvatarUrl={sponsor?.profile_pic_url || null}
        secondaryName={sponsor?.name || null}
        secondaryId={sponsor?.id || null}
      />
    </div>
  );

  // Helper: Render a chat row (used for both singles and matchmakr)
  const ChatRow = ({ photo, name, lastMessage, unreadCount, onClick, menu, timestamp, menuButton }: any) => (
    <div
      className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 mb-0.5"
      role="button"
      tabIndex={0}
      onClick={e => { if ((e.target as HTMLElement).closest('.menu-btn')) return; onClick && onClick(e); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(e); } }}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orbit-border/50 orbit-surface flex-shrink-0">
        {photo ? (
          <Image src={photo} alt={name} width={48} height={48} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-orbit-text">
            {name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="type-body truncate drop-shadow">{name}</div>
        <div className={`type-meta truncate ${unreadCount > 0 ? 'font-semibold tracking-[0.01em]' : ''}`}>
          {lastMessage || 'Click to chat'}
        </div>
      </div>
      {/* Fixed metadata block: timestamp + inline unread dot. Unread is a state, not a badge. */}
      <div className="w-[56px] flex items-center justify-end flex-shrink-0 ml-3">
        <span className="type-meta orbit-muted text-right whitespace-nowrap">{timestamp || '—'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orbit-gold ring-1 ring-orbit-surface1/50 ml-1.5 flex-shrink-0" style={{ opacity: unreadCount > 0 ? 1 : 0 }} aria-hidden />
      </div>
      {/* Three-dot menu button */}
      <div className="relative menu-btn flex items-center justify-end flex-shrink-0">
        {menuButton}
        {menu}
      </div>
    </div>
  );

  // Inline invite action component for unsponsored state
  const InviteAction = () => (
    <button
      onClick={() => setIsInviteOpen(true)}
      className="orbit-btn-secondary type-meta px-3 py-1 text-sm shadow-sm"
    >
      Invite
    </button>
  );
  
  // Inline invite action component for sponsored state
  const InviteSponsorAction = () => (
    <button
      onClick={() => setIsInviteSponsorOpen(true)}
      className="orbit-btn-secondary type-meta px-3 py-1 text-sm shadow-sm"
    >
      Invite
    </button>
  );

  if (!sponsor) {
    // Unsponsored Single state: How Orbit Works + Invite Sponsor CTA
    return (
      <>
        <ProfileSection />
        <div className="flex flex-col w-full">

          {/* Pending sponsorship requests — actionable, always shown when present */}
          {pendingRequests.length > 0 && (
            <section className="mt-10">
              <SectionHeader title="Pending invitations" />
              <div className="mt-4 flex flex-col gap-3">
                {pendingRequests.map((req) => {
                  const sponsorName = sponsorNameMap[req.sponsor_id] || 'Someone';
                  const photoUrl = sponsorPhotoMap[req.sponsor_id] ?? null;
                  const acceptLabel = sponsorNameMap[req.sponsor_id] ? `Yes, choose ${sponsorName}` : 'Yes, choose this sponsor';
                  return (
                  <GlassCard key={req.id} className="p-4 shadow-lg ring-1 ring-primary-blue/10 hover:shadow-xl transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-12 h-12 rounded-full border border-orbit-border/50 overflow-hidden bg-orbit-surface/50">
                        {photoUrl ? (
                          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-orbit-text">
                            {getInitials(sponsorName)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="type-body font-semibold text-orbit-text mb-1">
                          {sponsorName} wants to be your sponsor
                        </h3>
                        <p className="type-meta text-orbit-muted mb-4">
                          As your sponsor, {sponsorName} will represent you inside Orbit — managing your profile, exploring potential introductions, chatting with other sponsors, and personally introducing you to other single users.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleAcceptSponsorship(req.id)}
                            disabled={requestActionLoading === req.id}
                            className="rounded-cta px-4 py-2 min-h-[40px] bg-action-primary text-orbit-canvas font-semibold shadow-cta-entry hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {requestActionLoading === req.id ? 'Accepting...' : acceptLabel}
                          </button>
                          <button
                            onClick={() => handleDeclineSponsorship(req.id)}
                            disabled={requestActionLoading === req.id}
                            className="orbit-btn-secondary px-4 py-2 min-h-[40px] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                  );
                })}
              </div>
            </section>
          )}

          {/* How Orbit Works */}
          <section className="mt-10">
            <GlassCard className="p-5">
              <p className="type-label font-semibold text-orbit-text mb-4">How Orbit works</p>
              <div className="flex flex-col gap-5">
                {[
                  { n: '1', title: 'Your sponsor builds your profile', sub: 'Someone who knows you best tells your story' },
                  { n: '2', title: 'They connect with other sponsors', sub: 'Sponsors talk to find someone great for you' },
                  { n: '3', title: 'You get introduced', sub: 'When both sponsors agree, you meet someone worth meeting' },
                ].map(({ n, title, sub }) => (
                  <div key={n} className="flex items-start gap-4">
                    <div className="shrink-0 w-7 h-7 rounded-full border border-orbit-gold flex items-center justify-center">
                      <span className="type-meta font-semibold text-orbit-gold leading-none">{n}</span>
                    </div>
                    <div>
                      <p className="type-body font-semibold text-orbit-text">{title}</p>
                      <p className="type-meta text-orbit-muted mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          {/* Who knows you best? — invite sponsor CTA */}
          <section className="mt-6">
            <button
              onClick={() => setIsInviteOpen(true)}
              className="w-full rounded-cta px-6 py-5 bg-orbit-gold text-orbit-canvas font-semibold shadow-cta-entry hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-orbit-gold focus:ring-offset-2 transition-opacity duration-200 text-center"
            >
              <span className="block text-base tracking-[0.02em]">Who knows you best?</span>
              <span className="block type-meta text-orbit-canvas/70 mt-1">Invite them to be your sponsor.</span>
            </button>
          </section>

          <InviteMatchMakrModal
            isOpen={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            onSuccess={(mode) => setToast({ message: mode === 'connect' ? 'Request sent' : 'Invite sent', type: 'success' })}
          />

          {/* Communities */}
          <section className="mt-10">
            <MyCommunitiesSection
              descriptionText="Communities help sponsors discover compatible singles."
              helperText="Find the communities that you are a part of, most members join a few"
            />
          </section>

          {/* Preview cards section - only renders when there are previews */}
          <PreviewCardsSection userId={userId} />

          {/* Availability section */}
          <div className="mt-12">
            <SectionHeader title="Availability" />
            <AvailabilitySection
              status={displayStatus}
              userId={userId}
            />
          </div>

          {/* Footer spacer with brand mark */}
          <DashboardFooterSpacer />
        </div>
        {/* Single-to-Single Chat Modal (edge case: unsponsored user with an existing match) */}
        {openChat && selectedSingle && (
          <ChatModal
            open={openChat}
            onClose={() => { setOpenChat(false); setSelectedSingle(null); fetchMatches(); }}
            currentUserId={userId}
            currentUserName={userName}
            currentUserProfilePic={userProfilePic}
            otherUserId={selectedSingle.otherSingle.id}
            otherUserName={selectedSingle.otherSingle.name}
            otherUserProfilePic={selectedSingle.otherSingle.photo}
            aboutSingle={{ id: userId, name: userName, photo: userPhotos && userPhotos.length > 0 ? userPhotos[0] : null }}
            clickedSingle={{ id: selectedSingle.otherSingle.id, name: selectedSingle.otherSingle.name, photo: selectedSingle.otherSingle.photo }}
            isSingleToSingle={true}
          />
        )}
        {/* Unmatch Confirmation Modal */}
        {showUnmatchModal && unmatchTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="orbit-surface-strong rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-orbit-border/50">
              <h2 className="type-section mb-4">Unmatch with {unmatchTarget.otherSingle.name}?</h2>
              <p className="text-orbit-muted mb-6">
                This will permanently remove your match and chat history. You would need to be matched again to chat in the future.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={() => { setShowUnmatchModal(false); setUnmatchTarget(null); }} className="orbit-btn-secondary px-6 py-2 rounded-md font-semibold">
                  Cancel
                </button>
                <button onClick={handleUnmatch} className="rounded-cta px-6 py-2 min-h-[44px] bg-action-primary text-orbit-canvas font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:ring-offset-2 transition-colors duration-200">
                  Unmatch
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  const hasIntroductions = singleChats.length > 0;

  return (
    <>
      {/* Profile section - hero surface */}
      <ProfileSection />

      {/* Sections with proper spacing */}
      <div className="flex flex-col w-full">
        {/* Sponsor status card — waiting for first introduction */}
        {!hasIntroductions && (
          <section className="mt-6">
            {displayStatus === 'NEEDS_ATTENTION' ? (
              // State 2a: Has sponsor, profile incomplete — sponsor is building it
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/profile/${userId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/profile/${userId}`); }}
              >
                <GlassCard className="p-5" style={{ borderLeft: '3px solid rgb(var(--orbit-gold))' }}>
                  <div className="flex justify-between items-baseline">
                    <p className="type-body text-orbit-text" style={{ fontWeight: 500 }}>
                      {sponsor.name} is building your profile
                    </p>
                    <span
                      className="text-sm text-orbit-muted hover:text-orbit-text2 cursor-pointer shrink-0 ml-3"
                      onClick={e => { e.stopPropagation(); router.push(`/profile/${userId}`); }}
                    >
                      View profile
                    </span>
                  </div>
                  <p className="type-meta text-orbit-muted mt-2">
                    Your sponsor is setting up your Orbit profile. Want to speed things up? Send them a message.
                  </p>
                </GlassCard>
              </div>
            ) : (
              // State 2b: Has sponsor, profile complete, no introductions yet
              <GlassCard className="p-5" style={{ borderLeft: '3px solid rgb(var(--orbit-gold))' }}>
                <div className="flex justify-between items-baseline">
                  <p className="type-body text-orbit-text" style={{ fontWeight: 500 }}>
                    {sponsor.name} is your sponsor
                  </p>
                  <span
                    className="text-sm text-orbit-muted hover:text-orbit-text2 cursor-pointer shrink-0 ml-3"
                    onClick={() => router.push(`/profile/${userId}`)}
                  >
                    View profile
                  </span>
                </div>
                <p className="type-meta text-orbit-muted mt-2">
                  They're connecting with other sponsors to find the right introduction for you. You'll see it here when it happens.
                </p>
              </GlassCard>
            )}
          </section>
        )}

        {/* Notifications — only in full dashboard state */}
        {hasIntroductions && (
        <section className="mt-10 first:mt-0">
          <NotificationsSection userId={userId} />
        </section>
        )}

        {/* Pending sponsorship requests */}
        {pendingRequests.length > 0 && (
          <section className="mt-10">
            <SectionHeader title="Pending invitations" />
            <div className="mt-4 flex flex-col gap-3">
              {pendingRequests.map((req) => {
                const sponsorName = sponsorNameMap[req.sponsor_id] || 'Someone';
                const photoUrl = sponsorPhotoMap[req.sponsor_id] ?? null;
                const acceptLabel = sponsorNameMap[req.sponsor_id] ? `Yes, choose ${sponsorName}` : 'Yes, choose this sponsor';
                return (
                <GlassCard key={req.id} className="p-4 shadow-lg ring-1 ring-orbit-gold/10 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-12 h-12 rounded-full border border-orbit-border/30 overflow-hidden bg-orbit-surface-1/20">
                      {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-orbit-text">
                          {getInitials(sponsorName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="type-body font-semibold text-orbit-text mb-1">
                        {sponsorName} wants to be your sponsor
                      </h3>
                      <p className="type-meta text-orbit-muted mb-4">
                        As your sponsor, {sponsorName} will represent you inside Orbit — managing your profile, exploring potential introductions, chatting with other sponsors, and personally introducing you to other single users.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleAcceptSponsorship(req.id)}
                          disabled={requestActionLoading === req.id}
                          className="rounded-cta px-4 py-2 min-h-[40px] bg-action-primary text-orbit-canvas font-semibold shadow-cta-entry hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {requestActionLoading === req.id ? 'Accepting...' : acceptLabel}
                        </button>
                        <button
                          onClick={() => handleDeclineSponsorship(req.id)}
                          disabled={requestActionLoading === req.id}
                          className="orbit-btn-secondary px-4 py-2 min-h-[40px] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
                );
              })}
            </div>
          </section>
        )}
        
        {/* My Sponsor Section */}
        <section className="mt-10">
          <SectionHeader title="My Sponsor" right={<InviteSponsorAction />} />
          <div className="mt-4">
            <ChatRow
            photo={sponsor.profile_pic_url}
            name={sponsor.name}
            lastMessage={sponsorLastMessage}
            unreadCount={sponsorUnreadCount}
            onClick={() => { router.push(`/dashboard/chat/single/${userId}`); }}
            timestamp={sponsorTimestamp}
            menuButton={
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-orbit-surface/50 focus:outline-none transition-colors text-orbit-text2"
                onClick={e => { e.stopPropagation(); setSponsorMenuOpen(!sponsorMenuOpen); setMenuOpenIdx(null); }}
                tabIndex={-1}
                aria-label="Open menu"
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            }
            menu={sponsorMenuOpen && (
              <div ref={sponsorMenuRef} className="absolute right-0 mt-2 w-40 bg-orbit-surface-2 border border-orbit-border rounded-xl shadow-xl z-20 py-2">
                <button
                  className="block w-full text-left px-5 py-3 text-base text-orbit-text hover:bg-orbit-surface-1 rounded-xl font-semibold transition-colors"
                  onClick={e => { e.stopPropagation(); router.push(`/profile/${sponsor.id}`); setSponsorMenuOpen(false); }}
                >
                  View sponsor
                </button>
                <button
                  className="block w-full text-left px-5 py-3 text-base text-orbit-warning hover:bg-orbit-surface-1 rounded-xl font-semibold transition-colors"
                  onClick={e => { e.stopPropagation(); setShowEndSponsorshipModal(true); setSponsorMenuOpen(false); }}
                >
                  End sponsorship
                </button>
              </div>
            )}
          />
          </div>
        </section>
        
        {/* My Matches Section — only shown once introductions exist */}
        {hasIntroductions && (
        <section className="mt-10">
          <SectionHeader title="Introduced by my sponsor" />
          <div className="mt-4 flex flex-col gap-4">
            {singleChats.map((row, idx) => (
              <ChatRow
                key={row.otherSingle.id}
                photo={row.otherSingle.photo}
                name={row.otherSingle.name}
                lastMessage={row.lastMessage ? row.lastMessage.content : 'Click to chat'}
                unreadCount={row.unreadCount}
                onClick={() => handleOpenSingleChat(row)}
                timestamp={row.lastMessage ? new Date(row.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                menuButton={
                  <button
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-orbit-surface/50 focus:outline-none transition-colors text-orbit-text2"
                    onClick={e => { e.stopPropagation(); setMenuOpenIdx(idx === menuOpenIdx ? null : idx); setSponsorMenuOpen(false); }}
                    tabIndex={-1}
                    aria-label="Open menu"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                }
                menu={menuOpenIdx === idx && (
                  <div ref={el => { menuRefs.current[idx] = el; }} className="absolute right-0 mt-2 w-40 bg-orbit-surface-2 border border-orbit-border rounded-xl shadow-xl z-20 py-2">
                    <button
                      className="block w-full text-left px-5 py-3 text-base text-orbit-warning hover:bg-orbit-surface-1 rounded-xl font-semibold transition-colors"
                      onClick={e => { e.stopPropagation(); setShowUnmatchModal(true); setUnmatchTarget(row); setMenuOpenIdx(null); }}
                    >
                      Unmatch
                    </button>
                  </div>
                )}
              />
            ))}
            <InviteSingleReferralRow onClick={() => setIsInviteSingleReferralOpen(true)} />
          </div>
        </section>
        )}

        {/* Communities */}
        <section className="mt-10">
          <MyCommunitiesSection
            descriptionText="Communities help sponsors discover compatible singles."
            helperText="Find the communities that you are a part of, most members join a few"
          />
        </section>

        {/* Help grow Orbit — shown in waiting state (in full state it lives inside the matches section) */}
        {!hasIntroductions && (
          <div className="mt-4">
            <InviteSingleReferralRow onClick={() => setIsInviteSingleReferralOpen(true)} />
          </div>
        )}

        {/* Preview cards section - only renders when there are previews */}
        <PreviewCardsSection userId={userId} />
        
        {/* Availability section - at the very bottom */}
        <div className="mt-12">
          <SectionHeader title="Availability" />
          <AvailabilitySection 
            status={displayStatus}
            userId={userId}
          />
        </div>
        
        {/* Footer spacer with brand mark */}
        <DashboardFooterSpacer />
      </div>
      
      {/* Invite Sponsor Modal */}
      <InviteMatchMakrModal
        isOpen={isInviteSponsorOpen}
        onClose={() => setIsInviteSponsorOpen(false)}
        onSuccess={(mode) => setToast({ message: mode === 'connect' ? 'Request sent' : 'Invite sent', type: 'success' })}
      />
      
      {/* Invite Single Referral Modal (Single → Single) */}
      <InviteSingleReferralModal
        isOpen={isInviteSingleReferralOpen}
        onClose={() => setIsInviteSingleReferralOpen(false)}
        onSuccess={() => setToast({ message: 'Invite sent.', type: 'success' })}
      />
      
      {/* Chat Modal and other logic remain unchanged */}
      {/* Single-to-Single Chat Modal */}
      {openChat && selectedSingle && (
        <ChatModal
          open={openChat}
          onClose={() => { setOpenChat(false); setSelectedSingle(null); fetchMatches(); }}
          currentUserId={userId}
          currentUserName={userName}
          currentUserProfilePic={userProfilePic}
          otherUserId={selectedSingle.otherSingle.id}
          otherUserName={selectedSingle.otherSingle.name}
          otherUserProfilePic={selectedSingle.otherSingle.photo}
          aboutSingle={{ id: userId, name: userName, photo: userPhotos && userPhotos.length > 0 ? userPhotos[0] : null }}
          clickedSingle={{ id: selectedSingle.otherSingle.id, name: selectedSingle.otherSingle.name, photo: selectedSingle.otherSingle.photo }}
          isSingleToSingle={true}
        />
      )}

      {/* Chat Modal for Sponsor */}
      {openChat && !selectedSingle && (
        <ChatModal
          open={openChat}
          onClose={() => setOpenChat(false)}
          currentUserId={userId}
          currentUserName={userName}
          currentUserProfilePic={userProfilePic}
          otherUserId={sponsor.id}
          otherUserName={sponsor.name || ''}
          otherUserProfilePic={sponsor.profile_pic_url}
          aboutSingle={{ id: userId, name: userName, photo: userPhotos && userPhotos.length > 0 ? userPhotos[0] : null }}
          clickedSingle={{ id: sponsor.id, name: sponsor.name || '', photo: sponsor.profile_pic_url }}
        />
      )}
      {/* End Sponsorship Modal */}
      <EndSponsorshipModal
        isOpen={showEndSponsorshipModal}
        onClose={() => setShowEndSponsorshipModal(false)}
        onConfirm={handleEndSponsorship}
        sponsorName={sponsor?.name || undefined}
        isSponsorView={false}
      />
      {/* Unmatch Confirmation Modal */}
      {showUnmatchModal && unmatchTarget && (
        <div className="fixed inset-0 bg-orbit-canvas/80 flex justify-center items-center z-50">
          <div className="bg-orbit-surface-2 rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-orbit-border/40">
            <h2 className="type-section mb-4">Unmatch with {unmatchTarget.otherSingle.name}?</h2>
            <p className="text-orbit-muted mb-6">
              This will permanently remove your match and chat history. You would need to be matched again to chat in the future.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setShowUnmatchModal(false); setUnmatchTarget(null); }} className="orbit-btn-secondary px-6 py-2 rounded-md font-semibold">
                Cancel
              </button>
              <button onClick={handleUnmatch} className="rounded-cta px-6 py-2 min-h-[44px] bg-action-primary text-orbit-canvas font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 focus:ring-offset-2 transition-colors duration-200">
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default SingleDashboardClient; 