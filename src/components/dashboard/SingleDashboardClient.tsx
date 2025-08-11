"use client";
import React, { useState, useEffect, useRef } from 'react';
import ChatModal from '@/components/chat/ChatModal';
import { createClient } from '@/lib/supabase/client';
import FlameUnreadIcon from './FlameUnreadIcon';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InviteMatchMakrModal from '@/components/dashboard/InviteMatchMakrModal';
import EndSponsorshipModal from './EndSponsorshipModal';

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
  const supabase = createClient();
  const menuRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sponsorMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Refactor fetchMatches to be callable
  const fetchMatches = async () => {
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
  };

  useEffect(() => {
    fetchMatches();
  }, [userId]);

  // Real-time subscription for matches
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase.channel('public:matches')
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
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

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
        setSponsorLastMessage('Click to chat with your MatchMakr');
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

  // Profile section at the top (matches schematic)
  const ProfileSection = () => (
    <div className="flex flex-col mb-4">
      {/* Personalized greeting */}
      <div className="text-left self-start mb-4">
        <h1 className="text-xl font-bold text-white">Hello, {userName?.split(' ')[0] || 'there'}!</h1>
      </div>
      <div className="flex flex-col items-center">
        <button
          onClick={() => router.push(`/profile/${userId}`)}
          className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden mb-2 focus:outline-none focus:ring-2 focus:ring-accent-teal-light"
          aria-label="Go to My Profile"
        >
          {userProfilePic ? (
            <Image src={userProfilePic} alt={userName} width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary-blue">{userName?.charAt(0).toUpperCase() || '?'}</div>
          )}
        </button>
        <button
          onClick={() => router.push(`/profile/${userId}`)}
          className="text-base underline text-white hover:text-accent-teal-light focus:outline-none"
        >
          My Profile
        </button>
      </div>
    </div>
  );

  // Helper: Render a chat row (used for both singles and matchmakr)
  const ChatRow = ({ photo, name, lastMessage, unreadCount, onClick, menu, timestamp, menuButton }: any) => (
    <div
      className="flex items-center gap-4 py-3 w-full bg-white/10 rounded-xl border border-white/20 shadow-card transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white mb-1 pl-3"
      role="button"
      tabIndex={0}
      onClick={e => { if ((e.target as HTMLElement).closest('.menu-btn')) return; onClick && onClick(e); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(e); } }}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex-shrink-0">
        {photo ? (
          <Image src={photo} alt={name} width={48} height={48} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-200">
            {name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate drop-shadow">{name}</div>
        <div className="text-sm text-blue-100 truncate">
          {lastMessage || 'Click to chat'}
        </div>
      </div>
      {timestamp && (
        <div className="text-xs text-blue-100 ml-2 whitespace-nowrap" style={{marginRight: 'auto'}}>
          {timestamp}
        </div>
      )}
      {unreadCount > 0 && (
        <div className="ml-2 flex items-center">
          <FlameUnreadIcon count={unreadCount} />
        </div>
      )}
      {/* Three-dot menu button */}
      <div className="relative menu-btn flex items-center justify-end ml-auto">
        {menuButton}
        {menu}
      </div>
    </div>
  );

  if (!sponsor) {
    // Only show a single invite button, centered, with modal
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    return (
      <>
        <ProfileSection />
        <div className="flex flex-col gap-4 w-full items-center">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="bg-gradient-primary text-white px-6 py-3 rounded-full font-semibold text-lg shadow-button hover:shadow-button-hover transition-all duration-300 hover:-translate-y-1 mt-4"
          >
            Invite someone to be my MatchMakr!
          </button>
          <InviteMatchMakrModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
          <h2 className="text-xl font-light text-white mt-8 mb-2 border-b border-white/20 pb-1 w-full tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>MY MATCHES</h2>
          <div className="text-blue-100 mb-6 w-full text-center">No matches yet. Once your matchmakrs approve a match, you can chat here!</div>
          <h2 className="text-xl font-light text-white mt-6 mb-2 border-b border-white/20 pb-1 w-full tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>MY SNEAK PEAKS</h2>
          <div className="h-16" />
        </div>
      </>
    );
  }

  return (
    <>
      <ProfileSection />
      <div className="flex flex-col gap-4 w-full">
        {/* My Sponsors Section */}
        <h2 className="text-xl font-light text-white mb-2 border-b border-white/20 pb-1 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>MY SPONSORS</h2>
        <ChatRow
          photo={sponsor.profile_pic_url}
          name={sponsor.name}
          lastMessage={sponsorLastMessage}
          unreadCount={sponsorUnreadCount}
          onClick={() => { router.push(`/dashboard/chat/single/${userId}`); }}
          timestamp={sponsorTimestamp}
          menuButton={
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 focus:outline-none transition-colors"
              onClick={e => { e.stopPropagation(); setSponsorMenuOpen(!sponsorMenuOpen); setMenuOpenIdx(null); }}
              tabIndex={-1}
              aria-label="Open menu"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="#fff"/>
                <circle cx="12" cy="12" r="1.5" fill="#fff"/>
                <circle cx="12" cy="19" r="1.5" fill="#fff"/>
              </svg>
            </button>
          }
          menu={sponsorMenuOpen && (
            <div ref={sponsorMenuRef} className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
              <button
                className="block w-full text-left px-5 py-3 text-base text-primary-blue hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                onClick={e => { e.stopPropagation(); router.push(`/profile/${sponsor.id}`); setSponsorMenuOpen(false); }}
              >
                View MatchMakr
              </button>
              <button
                className="block w-full text-left px-5 py-3 text-base text-red-600 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                onClick={e => { e.stopPropagation(); setShowEndSponsorshipModal(true); setSponsorMenuOpen(false); }}
              >
                End Sponsorship
              </button>
            </div>
          )}
        />
        {/* My Matches Section */}
        <h2 className="text-xl font-light text-white mt-6 mb-2 border-b border-white/20 pb-1 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>MY MATCHES</h2>
        {singleChats.length === 0 ? (
          <div className="text-blue-100 mb-6">No matches yet. Once your matchmakrs approve a match, you can chat here!</div>
        ) : (
          <div className="flex flex-col gap-2">
            {singleChats.map((row, idx) => (
              <ChatRow
                key={row.otherSingle.id}
                photo={row.otherSingle.photo}
                name={row.otherSingle.name}
                lastMessage={row.lastMessage ? row.lastMessage.content : 'Click to chat with your match'}
                unreadCount={row.unreadCount}
                onClick={() => handleOpenSingleChat(row)}
                timestamp={row.lastMessage ? new Date(row.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                menuButton={
                  <button
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 focus:outline-none transition-colors"
                    onClick={e => { e.stopPropagation(); setMenuOpenIdx(idx === menuOpenIdx ? null : idx); setSponsorMenuOpen(false); }}
                    tabIndex={-1}
                    aria-label="Open menu"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" fill="#fff"/>
                      <circle cx="12" cy="12" r="1.5" fill="#fff"/>
                      <circle cx="12" cy="19" r="1.5" fill="#fff"/>
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
        {/* My Sneak Peaks Section */}
        <h2 className="text-xl font-bold text-white mt-6 mb-2 border-b border-white/20 pb-1">My Sneak Peaks</h2>
        <div className="h-16" />
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

        {/* Chat Modal for MatchMakr */}
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
              <h2 className="text-2xl font-bold mb-4 text-primary-blue">Unmatch with {unmatchTarget.otherSingle.name}?</h2>
              <p className="text-gray-600 mb-6">
                This will permanently remove your match and chat history. You would need to be matched again to chat in the future.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={() => { setShowUnmatchModal(false); setUnmatchTarget(null); }} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors">
                  Cancel
                </button>
                <button onClick={handleUnmatch} className="px-6 py-2 bg-gradient-primary text-white rounded-md hover:bg-gradient-light font-semibold transition-all duration-300 shadow-button hover:shadow-button-hover">
                  Yes, Unmatch
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Button - positioned normally in page flow, bottom right */}
        <div className="w-full flex justify-end mt-8 mb-4 pr-4">
            <a 
                href="/dashboard/settings"
                className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Settings"
            >
                {/* Settings Gear SVG */}
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82v.09c0 .66.39 1.26 1 1.51a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1z" />
                </svg>
                <span>Settings</span>
            </a>
        </div>
      </div>
    </>
  );
};

export default SingleDashboardClient; 