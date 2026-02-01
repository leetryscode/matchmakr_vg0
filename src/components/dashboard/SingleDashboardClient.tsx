"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatModal from '@/components/chat/ChatModal';
import { getSupabaseClient } from '@/lib/supabase/client';
import FlameUnreadIcon from './FlameUnreadIcon';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InviteMatchMakrModal from '@/components/dashboard/InviteMatchMakrModal';
import EndSponsorshipModal from './EndSponsorshipModal';
import NotificationsSection from '@/components/dashboard/NotificationsSection';
import PreviewCardsSection from '@/components/dashboard/PreviewCardsSection';
import SectionHeader from '@/components/ui/SectionHeader';
import PreviewRow from '@/components/ui/PreviewRow';
import GlassCard from '@/components/ui/GlassCard';
import PrimaryCTA from '@/components/ui/PrimaryCTA';
import DashboardFooterSpacer from '@/components/dashboard/DashboardFooterSpacer';
import TrustLockup from '@/components/dashboard/TrustLockup';
import AvailabilitySection from '@/components/dashboard/AvailabilitySection';
import { computeSingleStatus, SingleStatus } from '@/lib/status/singleStatus';

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
  approvedMatchCount
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
  const supabase = getSupabaseClient();
  const menuRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sponsorMenuRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null); // Track channel to prevent double-subscribe
  const instanceIdRef = useRef<string>(`single-dashboard-${Math.random().toString(36).substr(2, 9)}`);
  const router = useRouter();
  
  // Modal states for both sponsored and unsponsored flows
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviteSponsorOpen, setIsInviteSponsorOpen] = useState(false);

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

  // Profile section at the top with Trust Lockup
  const ProfileSection = () => (
    <div className="flex flex-col">
      {/* Personalized greeting */}
      <div className="text-left self-start mb-4">
        <h1 className="type-display">Hello, {userName?.split(' ')[0] || 'there'}</h1>
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
      className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50 mb-0.5"
      role="button"
      tabIndex={0}
      onClick={e => { if ((e.target as HTMLElement).closest('.menu-btn')) return; onClick && onClick(e); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(e); } }}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border-light bg-background-card flex-shrink-0">
        {photo ? (
          <Image src={photo} alt={name} width={48} height={48} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-blue">
            {name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="type-body truncate drop-shadow">{name}</div>
        <div className="type-meta truncate">
          {lastMessage || 'Click to chat'}
        </div>
      </div>
      {timestamp && (
        <div className="type-meta ml-3 whitespace-nowrap flex-shrink-0">
          {timestamp}
        </div>
      )}
      {unreadCount > 0 && (
        <div className="ml-2 flex items-center flex-shrink-0">
          <FlameUnreadIcon count={unreadCount} />
        </div>
      )}
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
      className="type-meta bg-background-card hover:bg-background-card/90 rounded-lg px-3 py-1 transition-colors shadow-sm hover:shadow-md"
    >
      Invite
    </button>
  );
  
  // Inline invite action component for sponsored state
  const InviteSponsorAction = () => (
    <button
      onClick={() => setIsInviteSponsorOpen(true)}
      className="type-meta bg-background-card hover:bg-background-card/90 rounded-lg px-3 py-1 transition-colors shadow-sm hover:shadow-md"
    >
      Invite
    </button>
  );

  if (!sponsor) {
    // Unsponsored Single state: Invite Sponsor CTA + empty states
    return (
      <>
        <ProfileSection />
        <div className="flex flex-col w-full">
          {/* Notifications */}
          <section className="mt-10 first:mt-0">
            <NotificationsSection userId={userId} />
          </section>
          
          {/* Sponsor chat section — same Preview Row pattern when no sponsor */}
          <section className="mt-10">
            <SectionHeader title="Sponsor chat" right={<InviteAction />} />
            <p className="mt-4 type-meta text-text-light">
              Invite someone to be your sponsor to get started.
            </p>
            <div className="mt-4">
              <PreviewRow title="Sponsor Name" subtitle="Chat with your sponsor about connections" />
            </div>
          </section>
          
          <InviteMatchMakrModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
          
          {/* My matches - empty state (Preview Row pattern for cold-start; reuse for other chat empty states later) */}
          <section className="mt-10">
            <SectionHeader title="Introduced by my sponsor" />
            <p className="mt-4 type-meta text-text-light">
              Conversations begin here after your sponsor makes an introduction.
            </p>
            <div className="mt-4">
              <PreviewRow title="Alex" subtitle="Introduced by Paula" label="Preview" />
            </div>
          </section>
          
          {/* Preview cards section - only renders when there are previews */}
          <PreviewCardsSection userId={userId} />
          
          {/* Availability section - underneath the chat sections */}
          <div>
            <SectionHeader title="Availability" />
            <AvailabilitySection 
              status={displayStatus}
              userId={userId}
            />
          </div>
          
          {/* Footer spacer with brand mark */}
          <DashboardFooterSpacer />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Profile section - hero surface */}
      <ProfileSection />
      
      {/* Sections with proper spacing */}
      <div className="flex flex-col w-full">
        {/* Notifications */}
        <section className="mt-10 first:mt-0">
          <NotificationsSection userId={userId} />
        </section>
        
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
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background-card/50 focus:outline-none transition-colors text-text-light"
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
              <div ref={sponsorMenuRef} className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                <button
                  className="block w-full text-left px-5 py-3 text-base text-primary-blue hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                  onClick={e => { e.stopPropagation(); router.push(`/profile/${sponsor.id}`); setSponsorMenuOpen(false); }}
                >
                  View sponsor
                </button>
                <button
                  className="block w-full text-left px-5 py-3 text-base text-red-600 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                  onClick={e => { e.stopPropagation(); setShowEndSponsorshipModal(true); setSponsorMenuOpen(false); }}
                >
                  End sponsorship
                </button>
              </div>
            )}
          />
          </div>
        </section>
        
        {/* My Matches Section — when empty, show Preview Row (cold-start); real intros render unchanged */}
        <section className="mt-10">
          <SectionHeader title="Introduced by my sponsor" />
          {singleChats.length === 0 ? (
            <>
              <p className="mt-4 type-meta text-text-light">
                Conversations begin here after your sponsor makes an introduction.
              </p>
              <div className="mt-4">
                <PreviewRow title="Alex" subtitle={`Introduced by ${sponsor?.name || 'your sponsor'}`} label="Preview" />
              </div>
            </>
          ) : (
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
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background-card/50 focus:outline-none transition-colors text-text-light"
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
                    <div ref={el => { menuRefs.current[idx] = el; }} className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                      <button
                        className="block w-full text-left px-5 py-3 text-base text-red-600 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                        onClick={e => { e.stopPropagation(); setShowUnmatchModal(true); setUnmatchTarget(row); setMenuOpenIdx(null); }}
                      >
                        Unmatch
                      </button>
                    </div>
                  )}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Preview cards section - only renders when there are previews */}
        <PreviewCardsSection userId={userId} />
        
        {/* Availability section - at the very bottom */}
        <div>
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
      <InviteMatchMakrModal isOpen={isInviteSponsorOpen} onClose={() => setIsInviteSponsorOpen(false)} />
      
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-background-card rounded-lg p-8 w-full max-w-md text-center shadow-xl border border-gray-200">
            <h2 className="type-section mb-4 text-primary-blue">Unmatch with {unmatchTarget.otherSingle.name}?</h2>
            <p className="text-gray-600 mb-6">
              This will permanently remove your match and chat history. You would need to be matched again to chat in the future.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setShowUnmatchModal(false); setUnmatchTarget(null); }} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleUnmatch} className="px-6 py-2 bg-gradient-primary text-white rounded-md hover:bg-gradient-light font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SingleDashboardClient; 