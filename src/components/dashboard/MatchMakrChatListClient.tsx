"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import FlameUnreadIcon from './FlameUnreadIcon';
import { useRouter, usePathname } from 'next/navigation';


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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevMsgCount = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
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
  const supabase = createClient();

  // Optimized realtime subscription for new messages
  useEffect(() => {
    if (!openConversationId) return;

    let channel: any = null;
    const setupSubscription = async () => {
      try {
        channel = supabase.channel(`messages-${openConversationId}`)
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
            console.log('Subscription status:', status);
          });
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [openConversationId, userId, supabase]);

  // Helper to fetch single info by ID
  const fetchSingleById = async (singleId: string) => {
    const supabase = createClient();
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

  // Always scroll to bottom when new messages arrive or modal opens
  useEffect(() => {
    if (!openChat) return;
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages, openChat]);

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
          const supabase = createClient();
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
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      alert('Failed to send message');
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
  const handleNavigateToChat = async (conversationId: string, otherId: string) => {
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
  };





  // Get sponsored single id (if any)
  const sponsoredSingleId = sponsoredSingles && sponsoredSingles.length > 0 ? sponsoredSingles[0].id : null;

  return (
    <div className="mb-8">
      {/* Section header, no container */}
                      <h2 className="text-xl font-light text-white mb-2 border-b border-white/20 pb-1 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>SPONSOR CHAT</h2>
      {/* Chat rows for matchmakrs only */}
      {localConversations.length === 0 ||
        localConversations.filter((msg: any) => {
          const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
          // Exclude the sponsored single from the MatchMakr Chat section
          if (sponsoredSingleId && otherId === sponsoredSingleId) return false;
          // Only show chats with other matchmakrs
          return !sponsoredSingles.some(s => s.id === otherId);
        }).length === 0 ? (
        <div className="text-white/90 mb-6">You have no more chats with Sponsors.</div>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          {localConversations
            .filter((msg: any) => {
              const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
              // Exclude the sponsored single from the MatchMakr Chat section
              if (sponsoredSingleId && otherId === sponsoredSingleId) return false;
              // Only show chats with other matchmakrs
              return !sponsoredSingles.some(s => s.id === otherId);
            })
            .map((msg: any) => {
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
                  className="flex items-center gap-4 py-3 pl-3 w-full bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-md transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    // Use the new function to handle navigation and unread count update
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
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex-shrink-0">
                    {profile?.profile_pic_url ? (
                      <img src={profile.profile_pic_url} alt={profile.name || 'Sponsor'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                        {profile?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate drop-shadow">{profile?.name || 'Unknown Sponsor'}</div>
                    <div className="text-xs text-white/80 truncate mb-1">{singlesInfo}</div>
                    <div className="text-sm text-white/90 truncate">{msg.content}</div>
                  </div>
                  <div className="text-xs text-white/70 ml-2 whitespace-nowrap" style={{marginRight: 'auto'}}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  {/* Unread icon, only show if unreadCount > 0 */}
                  {unreadCount > 0 && (
                    <div className="ml-2 flex items-center">
                      <FlameUnreadIcon count={unreadCount} />
                    </div>
                  )}
                  {/* Three dots menu */}
                  <div className="relative menu-btn flex items-center justify-end ml-auto">
                    <button
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 focus:outline-none transition-colors"
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === msg.conversation.id ? null : msg.conversation.id); }}
                      tabIndex={-1}
                      aria-label="Open menu"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                        <circle cx="12" cy="5" r="2" fill="#fff"/>
                        <circle cx="12" cy="12" r="2" fill="#fff"/>
                        <circle cx="12" cy="19" r="2" fill="#fff"/>
                      </svg>
                    </button>
                    {menuOpen === msg.conversation.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-t-lg"
                          onClick={e => { e.stopPropagation(); setConfirmDelete({otherId, profileName: profile?.name || 'this sponsor'}); setMenuOpen(null); }}
                        >
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {/* Sponsored Single Chat Row (if any) */}
      {sponsoredSingles && sponsoredSingles.length > 0 && (
        <div
          className="flex items-center gap-4 py-3 pl-3 w-full bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-md transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white mb-2"
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
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex-shrink-0">
            {sponsoredSingles[0].profile_pic_url ? (
              <img src={sponsoredSingles[0].profile_pic_url} alt={sponsoredSingles[0].name || 'Single'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                {sponsoredSingles[0].name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate drop-shadow">{sponsoredSingles[0].name}</div>
            <div className="text-sm text-white/90 truncate">Chat with your sponsored single</div>
          </div>
          {/* Unread icon, only show if unreadCount > 0 */}
          {sponsoredSingleUnreadCount > 0 && (
            <div className="ml-2 flex items-center">
              <FlameUnreadIcon count={sponsoredSingleUnreadCount} />
            </div>
          )}

        </div>
      )}
      <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-full font-semibold text-lg border border-white/30 shadow-deep transition-all duration-300 hover:-translate-y-2">
        Invite another sponsor
      </button>
      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4 text-primary-blue">Delete Chat?</h3>
            <p className="mb-6 text-gray-600">Delete chat for both parties? You can restart the conversation by finding them in the pond</p>
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