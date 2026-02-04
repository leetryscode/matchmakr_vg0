"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import GlassCard from '@/components/ui/GlassCard';


interface MatchMakrChatListClientProps {
  userId: string;
  conversations: any[];
  otherProfiles: Record<string, any>;
  sponsoredSingles: { id: string; name: string; profile_pic_url: string | null }[];
  currentUserName: string;
  currentUserProfilePic: string | null;
}

function areMessagesEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].content !== b[i].content) return false;
  }
  return true;
}

function removeDuplicateOptimisticMessages(serverMessages: any[], optimisticMessages: any[]) {
  return optimisticMessages.filter(om => {
    return !serverMessages.some(sm =>
      sm.content === om.content &&
      Math.abs(new Date(sm.created_at).getTime() - new Date(om.created_at).getTime()) < 10000 // 10s window
    );
  });
}

const MatchMakrChatListClient: React.FC<MatchMakrChatListClientProps> = ({ userId, conversations, otherProfiles, sponsoredSingles, currentUserName, currentUserProfilePic }) => {
  const [openChat, setOpenChat] = useState<null | { id: string; name: string; profile_pic_url: string }>(null);
  const [otherSponsoredSingle, setOtherSponsoredSingle] = useState<{ id: string; name: string; photo: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevMsgCount = useRef<number>(0);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{otherId: string, profileName: string} | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [localConversations, setLocalConversations] = useState(conversations);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [sponsoredSingleUnreadCount, setSponsoredSingleUnreadCount] = useState<number>(0);
  const [aboutSingle, setAboutSingle] = useState<{ id: string; name: string; photo: string | null } | null>(null);
  const [clickedSingle, setClickedSingle] = useState<{ id: string; name: string; photo: string | null } | null>(null);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [lastUnreadFetch, setLastUnreadFetch] = useState<number>(0);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const channelRef = useRef<any>(null); // Track channel to prevent double-subscribe
  const instanceIdRef = useRef<string>(`matchmakr-chatlist-${Math.random().toString(36).substr(2, 9)}`);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({}); // Refs for menu elements

  // Optimized realtime subscription for new messages
  useEffect(() => {
    if (!openConversationId || !userId) return; // Guard against auth transitions

    const channelName = `messages-${openConversationId}`;
    const instanceId = instanceIdRef.current;
    
    console.log(`[REALTIME-DEBUG] ${instanceId} | MatchMakrChatListClient | SUBSCRIBE | channel: ${channelName}`);

    // Cleanup previous channel if exists (guard against double-subscribe)
    if (channelRef.current) {
      console.log(`[REALTIME-DEBUG] ${instanceId} | MatchMakrChatListClient | CLEANUP-PREV | channel: ${channelName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${openConversationId}`
      }, payload => {
        const newMessage = payload.new;
        // Only add if it's not from the current user and belongs to the open conversation
        if (newMessage.sender_id !== userId && newMessage.conversation_id === openConversationId) {
          setChatMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe((status) => {
        console.log(`[REALTIME-DEBUG] ${instanceId} | MatchMakrChatListClient | SUBSCRIBE-STATUS | channel: ${channelName} | status: ${status}`);
      });
    
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`[REALTIME-DEBUG] ${instanceId} | MatchMakrChatListClient | CLEANUP | channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [openConversationId, userId]); // supabase is singleton, stable

  // Helper to fetch single info by ID
  const fetchSingleById = async (singleId: string) => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .eq('id', singleId)
      .single();
    if (data) {
      return {
        id: data.id,
        name: data.name || '',
        photo: data.photos && data.photos.length > 0 ? data.photos[0] : null,
      };
    }
    return { id: '', name: '', photo: null };
  };

  // Optimized fetch chat history function
  const fetchChatHistory = useCallback(async (forceRefresh = false) => {
    if (!openChat || !userId) return;
    
    // Rate limiting for chat history fetches
    const now = Date.now();
    if (!forceRefresh && now - lastUnreadFetch < 3000) {
      console.log('[MatchMakrChatListClient] Skipping chat history fetch - too recent');
      return;
    }

    setChatLoadingHistory(true);
    setShowSpinner(false);
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    loadingTimeout.current = setTimeout(() => {
      setShowSpinner(true);
    }, 200);
    
    try {
      let url = `/api/messages/history?userId=${userId}&otherId=${openChat.id}`;
      if (openConversationId) {
        url += `&conversation_id=${openConversationId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success && data.messages) {
        // Remove optimistic messages that are now confirmed
        const stillOptimistic = removeDuplicateOptimisticMessages(data.messages, chatMessages.filter(m => m.optimistic));
        setChatMessages([...data.messages, ...stillOptimistic]);
      }
      setLastUnreadFetch(now);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setChatLoadingHistory(false);
      setShowSpinner(false);
    }
  }, [openChat, userId, openConversationId, lastUnreadFetch]);

  // Fetch chat history when modal opens
  useEffect(() => {
    if (openChat && userId) {
      fetchChatHistory(true);
    }
  }, [openChat, userId, fetchChatHistory]);

  // After sending a message, refetch chat (but don't clear chatMessages)
  useEffect(() => {
    if (!sending && messageText === '' && openChat && userId) {
      fetchChatHistory();
    }
  }, [sending, messageText, openChat, userId, fetchChatHistory]);

  // Optimized unread counts fetching - consolidated into single function
  const fetchUnreadCounts = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastUnreadFetch < 5000) {
      console.log('[MatchMakrChatListClient] Skipping unread counts fetch - too recent');
      return;
    }

    try {
      const counts: Record<string, number> = {};
      
      // Use unread counts from conversation data if available
      for (const msg of conversations) {
        const conversationId = msg.conversation?.id;
        if (!conversationId) continue;
        
        if (msg.unreadCount !== undefined) {
          counts[conversationId] = msg.unreadCount;
        } else {
          // Only fetch from database if not available in conversation data
          const supabase = getSupabaseClient();
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', msg.sender_id === userId ? msg.recipient_id : msg.sender_id)
            .eq('recipient_id', userId)
            .eq('conversation_id', conversationId)
            .eq('read', false);
          counts[conversationId] = count || 0;
        }
      }
      
      setUnreadCounts(counts);
      setLastUnreadFetch(now);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [conversations, userId]);

  // Fetch unread counts when conversations change
  useEffect(() => {
    fetchUnreadCounts();
  }, [conversations, userId, fetchUnreadCounts]);

  // Refresh unread counts when returning to dashboard (pathname changes)
  useEffect(() => {
    if (pathname === '/dashboard/matchmakr') {
      fetchUnreadCounts(true);
    }
  }, [pathname, fetchUnreadCounts]);

  // Close menu on outside click/touch
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuOpen !== null) {
        const menuEl = menuRefs.current[menuOpen];
        if (menuEl && !menuEl.contains(event.target as Node)) {
          setMenuOpen(null);
        }
      }
    }
    if (menuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // After closing chat modal, refresh unread counts
  useEffect(() => {
    if (!openChat) {
      fetchUnreadCounts(true);
    }
  }, [openChat, fetchUnreadCounts]);

  // Optimistically append sent message
  const handleSendMessage = async () => {
    if (!userId || !openChat?.id || !messageText.trim()) return;
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: userId,
      recipient_id: openChat.id,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    setSending(true);
    try {
      const messageData: any = {
        sender_id: userId,
        recipient_id: openChat.id,
        content: optimisticMsg.content,
      };
      
      // Add singles context for MatchMakr-to-MatchMakr chats
      if (aboutSingle?.id && clickedSingle?.id) {
        messageData.about_single_id = aboutSingle.id;
        messageData.clicked_single_id = clickedSingle.id;
      }
      
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'This message couldn\'t be sent. Please try again.');
      }
    } catch (err) {
      alert('This message couldn\'t be sent. Please try again.');
    }
    setSending(false);
  };

  // Updated handleOpenChat to use conversation context
  const handleOpenChat = async (conversation: any, profile: { id: string; name: string; profile_pic_url: string | null }) => {
    // Debug: Log the conversation and profile data
    console.log('Dashboard: Opening chat with context:', {
      conversationId: conversation.id,
      aboutSingle: conversation?.conversation?.about_single,
      clickedSingle: conversation?.conversation?.clicked_single,
      profile: profile
    });
    
    setOpenChat({ id: profile.id, name: profile.name, profile_pic_url: profile.profile_pic_url || '' });
    
    // Use singles and conversation_id from the conversation object
    setAboutSingle(conversation?.conversation?.about_single || { id: '', name: '', photo: null });
    setClickedSingle(conversation?.conversation?.clicked_single || { id: '', name: '', photo: null });
    setOpenConversationId(conversation.id);

    // Mark messages as read for this specific conversation
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        otherId: profile.id,
        conversationId: conversation.id 
      }),
    });
    
    // Refresh unread counts after opening chat
    const counts: Record<string, number> = { ...unreadCounts };
    counts[conversation.id] = 0;
    setUnreadCounts(counts);
  };

  // Function to update unread count when navigating to chat page
  const handleNavigateToChat = useCallback(async (conversationId: string, otherId: string) => {
    // Mark messages as read for this specific conversation
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        otherId,
        conversationId 
      }),
    });
    
    // Update local unread count immediately
    const counts: Record<string, number> = { ...unreadCounts };
    counts[conversationId] = 0;
    setUnreadCounts(counts);
    
    // Navigate to chat page
    router.push(`/dashboard/chat/${conversationId}`);
  }, [userId, unreadCounts, router]);





  // Get sponsored single id (if any)
  const sponsoredSingleId = sponsoredSingles && sponsoredSingles.length > 0 ? sponsoredSingles[0].id : null;

  const [inviteSponsorEmail, setInviteSponsorEmail] = useState('');
  const [isInviteSponsorModalOpen, setIsInviteSponsorModalOpen] = useState(false);
  const [showSponsorChatFade, setShowSponsorChatFade] = useState(true);
  const sponsorChatScrollRef = useRef<HTMLDivElement>(null);
  const sponsorChatScrollRafRef = useRef<number | null>(null);

  const handleSponsorChatScroll = useCallback(() => {
    if (sponsorChatScrollRafRef.current != null) return;

    sponsorChatScrollRafRef.current = requestAnimationFrame(() => {
      sponsorChatScrollRafRef.current = null;
      const el = sponsorChatScrollRef.current;
      if (!el) return;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      const newFade = !atBottom;
      setShowSponsorChatFade(prev => (prev === newFade ? prev : newFade));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (sponsorChatScrollRafRef.current != null) cancelAnimationFrame(sponsorChatScrollRafRef.current);
    };
  }, []);

  // Memoize sponsor chat list to avoid rebuilding on unrelated rerenders
  const sponsorChats = useMemo(() => {
    const sponsorChatFilter = (msg: any) => {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (sponsoredSingleId && otherId === sponsoredSingleId) return false;
      return !sponsoredSingles.some(s => s.id === otherId);
    };
    return localConversations.filter(sponsorChatFilter);
  }, [localConversations, userId, sponsoredSingleId, sponsoredSingles]);

  const chatRows = useMemo(() => {
    return sponsorChats.map((msg: any) => {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      const profile = otherProfiles[otherId];
      const conversation = msg.conversation;
      const singlesInfo = conversation?.about_single && conversation?.clicked_single ?
        `${conversation.about_single.name} & ${conversation.clicked_single.name}` :
        'About singles';
      const unreadCount = msg.unreadCount || unreadCounts[conversation?.id] || 0;

      return (
        <div
          key={msg.id}
          className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50"
          role="button"
          tabIndex={0}
          onClick={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            handleNavigateToChat(msg.conversation.id, otherId);
          }}
          onKeyDown={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigateToChat(msg.conversation.id, otherId);
            }
          }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border-light bg-background-card flex-shrink-0">
            {profile?.profile_pic_url ? (
              <img src={profile.profile_pic_url} alt={profile.name || 'Sponsor'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-dark">
                {profile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="type-body truncate drop-shadow">{profile?.name || 'Unknown sponsor'}</div>
            <div className="type-meta truncate mb-1">{singlesInfo}</div>
            <div className={`type-meta truncate ${unreadCount > 0 ? 'font-semibold tracking-[0.01em]' : ''}`}>{msg.content}</div>
          </div>
          <div className="w-[56px] flex items-center justify-end flex-shrink-0 ml-3">
            <span className="type-meta text-text-light text-right whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="w-2 h-2 rounded-full bg-status-needs-attention ml-1.5 flex-shrink-0" style={{ opacity: unreadCount > 0 ? 1 : 0 }} aria-hidden />
          </div>
          <div className="relative menu-btn flex items-center justify-end flex-shrink-0">
            <button
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-background-card/50 focus:outline-none transition-colors text-text-light"
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === msg.conversation.id ? null : msg.conversation.id); }}
              tabIndex={-1}
              aria-label="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                <circle cx="12" cy="5" r="2" fill="currentColor"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <circle cx="12" cy="19" r="2" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen === msg.conversation.id && (
              <div
                ref={el => { menuRefs.current[msg.conversation.id] = el; }}
                className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              >
                <button
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-t-lg"
                  onClick={e => { e.stopPropagation(); setConfirmDelete({otherId, profileName: profile?.name || 'this sponsor'}); setMenuOpen(null); }}
                >
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [sponsorChats, otherProfiles, userId, unreadCounts, menuOpen, handleNavigateToChat]);

  // Inline invite action component
  const InviteAction = () => (
    <button
      onClick={() => setIsInviteSponsorModalOpen(true)}
      className="type-meta bg-background-card hover:bg-background-card/90 rounded-lg px-3 py-1 transition-colors shadow-sm hover:shadow-md"
    >
      Invite another sponsor
    </button>
  );

  return (
    <div>
      {/* Section header */}
      <SectionHeader title="Sponsor chat" right={<InviteAction />} />
      <div className="mt-4">
      {/* Chat rows for matchmakrs only */}
      {sponsorChats.length === 0 ? (
        <GlassCard variant="1" className="p-4 mb-6">
          <div className="text-center">
            <h3 className="type-body mb-1">No sponsor chats yet</h3>
            <p className="type-meta">
              Message another sponsor to coordinate introductions.
            </p>
          </div>
        </GlassCard>
      ) : (() => {
        const useScrollContainer = sponsorChats.length > 7;
        const listContent = (
          <div className={`flex flex-col gap-2.5 ${useScrollContainer ? '' : 'mb-6'}`}>
            {chatRows}
          </div>
        );

        if (useScrollContainer) {
          return (
            <div className="relative mb-6">
              <div
                ref={sponsorChatScrollRef}
                className="max-h-[420px] overflow-y-auto no-scrollbar pr-1"
                onScroll={handleSponsorChatScroll}
              >
                {listContent}
              </div>
              {/* Subtle "more below" fade — hides when scrolled to bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-b from-transparent to-background-main transition-opacity duration-200"
                style={{ opacity: showSponsorChatFade ? 1 : 0 }}
                aria-hidden
              />
            </div>
          );
        }

        return listContent;
      })()}
      </div>
      {/* Sponsored Single Chat Row (if any) */}
      {sponsoredSingles && sponsoredSingles.length > 0 && (
        <div
          className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-blue/50 mb-2"
          role="button"
          tabIndex={0}
          onClick={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            handleOpenChat({
              id: sponsoredSingles[0].id,
              name: sponsoredSingles[0].name,
              profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
            }, {
              id: sponsoredSingles[0].id,
              name: sponsoredSingles[0].name,
              profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
            });
          }}
          onKeyDown={e => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenChat({
                id: sponsoredSingles[0].id,
                name: sponsoredSingles[0].name,
                profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
              }, {
                id: sponsoredSingles[0].id,
                name: sponsoredSingles[0].name,
                profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
              });
            }
          }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border-light bg-background-card flex-shrink-0">
            {sponsoredSingles[0].profile_pic_url ? (
              <img src={sponsoredSingles[0].profile_pic_url} alt={sponsoredSingles[0].name || 'Single'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-dark">
                {sponsoredSingles[0].name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="type-body truncate drop-shadow">{sponsoredSingles[0].name}</div>
            <div className={`type-meta truncate ${sponsoredSingleUnreadCount > 0 ? 'font-semibold tracking-[0.01em]' : ''}`}>Chat with your sponsored single</div>
          </div>
          {/* Fixed metadata block: timestamp + inline unread dot. Unread is a state, not a badge. */}
          <div className="w-[56px] flex items-center justify-end flex-shrink-0 ml-3">
            <span className="type-meta text-text-light text-right whitespace-nowrap">—</span>
            <span className="w-2 h-2 rounded-full bg-status-needs-attention ml-1.5 flex-shrink-0" style={{ opacity: sponsoredSingleUnreadCount > 0 ? 1 : 0 }} aria-hidden />
          </div>

        </div>
      )}
      {/* Invite Sponsor Modal */}
      {isInviteSponsorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-background-card rounded-xl p-8 w-full max-w-md text-center shadow-card border border-white/20">
            <h2 className="type-section mb-4 text-text-dark">Invite a fellow sponsor</h2>
            <p className="text-text-light mb-6 leading-relaxed">
              Invite a friend to join our community helping friends find love.
            </p>
            <input
              type="email"
              value={inviteSponsorEmail}
              onChange={(e) => setInviteSponsorEmail(e.target.value)}
              placeholder="Their email address"
              className="w-full border border-white/20 rounded-xl px-4 py-3 mb-4 text-text-dark placeholder:text-text-dark placeholder:opacity-80 bg-background-card focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => { setIsInviteSponsorModalOpen(false); setInviteSponsorEmail(''); }} className="px-6 py-3 bg-white/20 text-text-dark rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 shadow-button hover:shadow-button-hover">
                Cancel
              </button>
              <button onClick={() => { alert(`(Not implemented) Invite would be sent to ${inviteSponsorEmail}`); setIsInviteSponsorModalOpen(false); setInviteSponsorEmail(''); }} className="rounded-cta px-6 py-3 min-h-[48px] bg-action-primary text-primary-blue font-semibold shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-action-primary">
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
            <h3 className="type-section mb-4 text-primary-blue">Delete chat?</h3>
            <p className="mb-6 text-gray-600">Delete chat for both parties? This clears the conversation for everyone. You can reconnect with this sponsor if you need to coordinate again.</p>
            <div className="flex gap-4 justify-center">
              <button
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700"
                onClick={async () => {
                  setDeletingChatId(confirmDelete.otherId);
                  
                  // Find the specific conversation that was clicked (using the menuOpen conversation ID)
                  // If menuOpen is null, we need to find the conversation by otherId and singles
                  let conv = null;
                  if (menuOpen) {
                    conv = localConversations.find(msg => {
                      return msg.conversation.id === menuOpen;
                    });
                  } else {
                    // Fallback: find by otherId and the first conversation with that otherId
                    conv = localConversations.find(msg => {
                      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
                      return otherId === confirmDelete.otherId;
                    });
                  }
                  
                  console.log('Delete clicked - menuOpen:', menuOpen);
                  console.log('Found conversation:', conv);
                  
                  if (!conv) {
                    console.error('No conversation found for deletion');
                    setDeletingChatId(null);
                    setConfirmDelete(null);
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/messages', {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        conversation_id: conv.conversation.id
                      }),
                    });
                    
                    if (response.ok) {
                      console.log('Chat deleted successfully');
                      // Remove the specific conversation from the list
                      setLocalConversations(localConversations.filter(msg => {
                        return msg.conversation.id !== conv.conversation.id;
                      }));
                    } else {
                      console.error('Failed to delete chat');
                    }
                  } catch (error) {
                    console.error('Error deleting chat:', error);
                  } finally {
                    setDeletingChatId(null);
                    setConfirmDelete(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MatchMakrChatListClient; 