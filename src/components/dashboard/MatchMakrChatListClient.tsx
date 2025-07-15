"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ChatModal from '../chat/ChatModal';
import { createClient } from '@/lib/supabase/client';
import FlameUnreadIcon from './FlameUnreadIcon';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const supabase = createClient();

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new;
        // If the new message belongs to the open conversation, add it to chatMessages
        if (openConversationId && newMessage.conversation_id === openConversationId) {
          setChatMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [openConversationId, supabase]);

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

  // Fetch chat history when modal opens
  useEffect(() => {
    let isMounted = true;
    const fetchChatHistory = async () => {
      if (!openChat || !userId) return;
      setChatLoadingHistory(true);
      setShowSpinner(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      loadingTimeout.current = setTimeout(() => {
        if (isMounted) setShowSpinner(true);
      }, 200);
      
      let url = `/api/messages/history?userId=${userId}&otherId=${openChat.id}`;
      if (openConversationId) {
        url += `&conversation_id=${openConversationId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (isMounted) {
        // Only update if new data is different
        if (data.success && data.messages && !areMessagesEqual(data.messages, chatMessages.filter(m => !m.optimistic))) {
          // Remove optimistic messages that are now confirmed
          const confirmedIds = new Set(data.messages.map((m: any) => m.id));
          const stillOptimistic = removeDuplicateOptimisticMessages(data.messages, chatMessages.filter(m => m.optimistic));
          setChatMessages([...data.messages, ...stillOptimistic]);
        }
        setChatLoadingHistory(false);
        setShowSpinner(false);
      }
    };
    if (openChat && userId) {
      fetchChatHistory();
    }
    return () => {
      isMounted = false;
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChat, userId, openConversationId]);

  // After sending a message, refetch chat (but don't clear chatMessages)
  useEffect(() => {
    let isMounted = true;
    if (!sending && messageText === '' && openChat && userId) {
      (async () => {
        let url = `/api/messages/history?userId=${userId}&otherId=${openChat.id}`;
        if (openConversationId) {
          url += `&conversation_id=${openConversationId}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data.success && data.messages) {
          // Only update if new data is different
          if (!areMessagesEqual(data.messages, chatMessages.filter(m => !m.optimistic))) {
            // Remove optimistic messages that are now confirmed
            const confirmedIds = new Set(data.messages.map((m: any) => m.id));
            const stillOptimistic = removeDuplicateOptimisticMessages(data.messages, chatMessages.filter(m => m.optimistic));
            setChatMessages([...data.messages, ...stillOptimistic]);
          }
        }
      })();
    }
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, messageText, openChat, userId, openConversationId]);

  // Smart auto-scroll: only scroll if modal is opened or user is near the bottom
  useEffect(() => {
    if (!openChat) return;
    const container = chatContainerRef.current;
    if (!container) return;
    // If modal just opened, always scroll to bottom
    if (chatMessages.length === 0 || prevMsgCount.current === 0) {
      container.scrollTop = container.scrollHeight;
    } else if (chatMessages.length > prevMsgCount.current) {
      // If user is near the bottom, scroll to bottom
      const threshold = 50; // px
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < threshold) {
        container.scrollTop = container.scrollHeight;
      }
    }
    prevMsgCount.current = chatMessages.length;
  }, [chatMessages.length, openChat]);

  // Always scroll to bottom when modal is opened
  useEffect(() => {
    if (!openChat) return;
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [openChat]);

  // Fetch unread counts for all conversations
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const msg of conversations) {
        const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        // Use unread count from conversation data if available, otherwise fetch
        if (msg.unreadCount !== undefined) {
          counts[otherId] = msg.unreadCount;
        } else {
          const supabase = createClient();
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherId)
            .eq('recipient_id', userId)
            .eq('read', false);
          counts[otherId] = count || 0;
        }
      }
      setUnreadCounts(counts);
    };
    fetchUnreadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, userId]);

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

    // Mark messages as read
    await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, otherId: profile.id }),
    });
    
    // Refresh unread counts after opening chat
    const counts: Record<string, number> = { ...unreadCounts };
    counts[profile.id] = 0;
    setUnreadCounts(counts);
  };

  // After closing chat modal, refresh unread counts
  useEffect(() => {
    if (!openChat) {
      // Refetch unread counts
      const fetchUnreadCounts = async () => {
        const supabase = createClient();
        const counts: Record<string, number> = {};
        for (const msg of conversations) {
          const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
          if (sponsoredSingles.some(s => s.id === otherId)) continue;
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherId)
            .eq('recipient_id', userId)
            .eq('read', false);
          counts[otherId] = count || 0;
        }
        setUnreadCounts(counts);
      };
      fetchUnreadCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChat]);

  // Get sponsored single id (if any)
  const sponsoredSingleId = sponsoredSingles && sponsoredSingles.length > 0 ? sponsoredSingles[0].id : null;

  return (
    <div className="mb-8">
      {/* Section header, no container */}
      <h2 className="font-inter font-bold text-xl text-white mb-2 border-b border-white/20 pb-1">MatchMakr Chat</h2>
      {/* Chat rows for matchmakrs only */}
      {localConversations.length === 0 ||
        localConversations.filter((msg: any) => {
          const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
          // Exclude the sponsored single from the MatchMakr Chat section
          if (sponsoredSingleId && otherId === sponsoredSingleId) return false;
          // Only show chats with other matchmakrs
          return !sponsoredSingles.some(s => s.id === otherId);
        }).length === 0 ? (
        <div className="text-blue-100 mb-6">You have no more chats with MatchMakrs.</div>
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
              const unreadCount = msg.unreadCount || unreadCounts[otherId] || 0;
              
              return (
                <div
                  key={msg.id}
                  className="flex items-center gap-4 py-3 pl-3 w-full bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-md transition group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    // Instead of handleOpenChat, navigate to the chat page
                    router.push(`/dashboard/chat/${msg.conversation.id}`);
                  }}
                  onKeyDown={e => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/dashboard/chat/${msg.conversation.id}`);
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex-shrink-0">
                    {profile?.profile_pic_url ? (
                      <img src={profile.profile_pic_url} alt={profile.name || 'MatchMakr'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-200">
                        {profile?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate drop-shadow">{profile?.name || 'Unknown MatchMakr'}</div>
                    <div className="text-xs text-blue-200 truncate mb-1">{singlesInfo}</div>
                    <div className="text-sm text-blue-100 truncate">{msg.content}</div>
                  </div>
                  <div className="text-xs text-blue-100 ml-2 whitespace-nowrap" style={{marginRight: 'auto'}}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === otherId ? null : otherId); }}
                      tabIndex={-1}
                      aria-label="Open menu"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                        <circle cx="12" cy="5" r="2" fill="#fff"/>
                        <circle cx="12" cy="12" r="2" fill="#fff"/>
                        <circle cx="12" cy="19" r="2" fill="#fff"/>
                      </svg>
                    </button>
                    {menuOpen === otherId && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-t-lg"
                          onClick={e => { e.stopPropagation(); setConfirmDelete({otherId, profileName: profile?.name || 'this matchmakr'}); setMenuOpen(null); }}
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
          onClick={() => handleOpenChat({
            id: sponsoredSingles[0].id,
            name: sponsoredSingles[0].name,
            profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
          }, {
            id: sponsoredSingles[0].id,
            name: sponsoredSingles[0].name,
            profile_pic_url: sponsoredSingles[0].profile_pic_url || ''
          })}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex-shrink-0">
            {sponsoredSingles[0].profile_pic_url ? (
              <img src={sponsoredSingles[0].profile_pic_url} alt={sponsoredSingles[0].name || 'Single'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-200">
                {sponsoredSingles[0].name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate drop-shadow">{sponsoredSingles[0].name}</div>
            <div className="text-sm text-blue-100 truncate">Chat with your sponsored single</div>
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
        Invite a Single User
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
                  // Find the conversation to get about_single_id and clicked_single_id
                  const conv = localConversations.find(msg => {
                    const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
                    return otherId === confirmDelete.otherId;
                  });
                  await fetch('/api/messages', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sender_id: userId,
                      recipient_id: confirmDelete.otherId,
                      about_single_id: conv?.conversation?.about_single?.id,
                      clicked_single_id: conv?.conversation?.clicked_single?.id
                    }),
                  });
                  setLocalConversations(localConversations.filter(msg => {
                    const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
                    return otherId !== confirmDelete.otherId;
                  }));
                  setConfirmDelete(null);
                  setDeletingChatId(null);
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