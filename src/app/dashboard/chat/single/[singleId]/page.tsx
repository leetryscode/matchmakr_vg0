'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GroupedMessageList from '@/components/chat/GroupedMessageList';
import { SCROLL_PIN_THRESHOLD_PX } from '@/constants/chat';

export default function SingleChatPage() {
  const router = useRouter();
  const { singleId } = useParams();
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [singleInfo, setSingleInfo] = useState<any>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [sponsorInfo, setSponsorInfo] = useState<{ id: string; name: string; photo: string | null } | null | undefined>(undefined);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);

  const supabase = getSupabaseClient();

  // Stable otherId — gate until we can disambiguate (SINGLE + sponsorInfo unknown = don't guess)
  const resolvedOtherId = useMemo(() => {
    if (!singleId) return null;
    if (currentUserType !== 'SINGLE') return singleId;

    if (sponsorInfo === undefined) return null;
    return sponsorInfo?.id ?? singleId;
  }, [singleId, currentUserType, sponsorInfo]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const isNearBottomNow = () => {
    const c = chatContainerRef.current;
    if (!c) return true;
    const dist = c.scrollHeight - (c.scrollTop + c.clientHeight);
    return dist < SCROLL_PIN_THRESHOLD_PX;
  };

  // Fetch current user ID, profile info, and user_type
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        if (user?.id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, name, photos, user_type, sponsored_by_id')
            .eq('id', user.id)
            .single();

          if (userProfile) {
            setCurrentUserInfo({
              id: userProfile.id,
              name: userProfile.name || 'You',
              photo: userProfile.photos && userProfile.photos.length > 0 ? userProfile.photos[0] : null
            });
            setCurrentUserType(userProfile.user_type);

            if (userProfile.user_type === 'SINGLE') {
              if (userProfile.sponsored_by_id) {
                const { data: sponsorProfile } = await supabase
                  .from('profiles')
                  .select('id, name, photos')
                  .eq('id', userProfile.sponsored_by_id)
                  .single();
                setSponsorInfo(sponsorProfile ? {
                  id: sponsorProfile.id,
                  name: sponsorProfile.name || 'Sponsor',
                  photo: sponsorProfile.photos && sponsorProfile.photos.length > 0 ? sponsorProfile.photos[0] : null
                } : null);
              } else {
                setSponsorInfo(null);
              }
            } else {
              setSponsorInfo(null);
            }
          } else {
            setSponsorInfo(null);
          }
        } else {
          setSponsorInfo(null);
        }
      } catch {
        setSponsorInfo(null);
      }
    };
    fetchUser();
  }, []);

  // Fetch single info and chat history (uses resolvedOtherId for consistency)
  useEffect(() => {
    if (!singleId || !currentUserId || !resolvedOtherId) return;

    setChatLoading(true);
    const fetchChatData = async () => {
      const { data: singleData } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('id', singleId)
        .single();

      if (singleData) {
        setSingleInfo({
          id: singleData.id,
          name: singleData.name || 'Unknown',
          photo: singleData.photos && singleData.photos.length > 0 ? singleData.photos[0] : null
        });
      }

      const historyRes = await fetch(`/api/messages/history?userId=${currentUserId}&otherId=${resolvedOtherId}`);
      const historyData = await historyRes.json();
      setChatMessages(historyData.success && historyData.messages ? historyData.messages : []);
      setChatLoading(false);

      if (currentUserType === 'SINGLE' && !sponsorInfo?.id) {
        const conversationKey = `firstChat_${currentUserId}_${singleId}`;
        const hasOpenedBefore = localStorage.getItem(conversationKey);
        if (!hasOpenedBefore) {
          localStorage.setItem(conversationKey, 'true');
        }
      }
    };
    fetchChatData();
  }, [singleId, currentUserId, resolvedOtherId, currentUserType, sponsorInfo?.id]);

  // Mark messages as read as soon as chat is opened
  useEffect(() => {
    if (!singleId || !currentUserId || !resolvedOtherId) return;
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, otherId: resolvedOtherId }),
    });
  }, [singleId, currentUserId, resolvedOtherId]);

  // Reset initial scroll flag when conversation changes
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [singleId]);

  // Initial scroll once when chat loads
  useEffect(() => {
    if (!chatLoading && chatMessages.length > 0 && !didInitialScrollRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          didInitialScrollRef.current = true;
        });
      });
    }
  }, [chatLoading, chatMessages.length]);

  // New messages — only scroll if user is near bottom *now*
  useEffect(() => {
    if (!didInitialScrollRef.current || chatMessages.length === 0) return;
    if (!isNearBottomNow()) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [chatMessages.length]);

  // Add typing indicator state
  const [isTyping, setIsTyping] = useState(false);

  // Realtime subscription for new messages
  const channelRef = useRef<any>(null);
  const instanceIdRef = useRef<string>(`single-chat-${singleId}-${Math.random().toString(36).substr(2, 9)}`);

  // Realtime subscription — guard until resolvedOtherId exists (avoids sponsorInfo race)
  useEffect(() => {
    if (!currentUserId || !resolvedOtherId) return;

    const channelName = `single-messages-${currentUserId}-${singleId}`;
    const instanceId = instanceIdRef.current;

    console.log(`[REALTIME-DEBUG] ${instanceId} | SingleChatPage | SUBSCRIBE | channel: ${channelName}`);

    if (channelRef.current) {
      console.log(`[REALTIME-DEBUG] ${instanceId} | SingleChatPage | CLEANUP-PREV | channel: ${channelName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new;
        if ((newMessage.sender_id === currentUserId && newMessage.recipient_id === resolvedOtherId) ||
            (newMessage.sender_id === resolvedOtherId && newMessage.recipient_id === currentUserId)) {
          setChatMessages(prev => {
            // Replace optimistic in place to avoid DOM churn and scroll jump
            let idx = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i].optimistic && prev[i].content === newMessage.content && prev[i].sender_id === newMessage.sender_id) {
                idx = i;
                break;
              }
            }
            if (idx === -1) return [...prev, newMessage];
            const copy = prev.slice();
            copy[idx] = newMessage;
            return copy;
          });
        }
      })
      .subscribe((status) => {
        console.log(`[REALTIME-DEBUG] ${instanceId} | SingleChatPage | SUBSCRIBE-STATUS | channel: ${channelName} | status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`[REALTIME-DEBUG] ${instanceId} | SingleChatPage | CLEANUP | channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, resolvedOtherId, singleId]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !singleId || !currentUserId || !resolvedOtherId) return;
    setSending(true);

    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: resolvedOtherId,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');

    // Explicit intent: after sending, user wants to be at the bottom
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          recipient_id: resolvedOtherId,
          content: optimisticMsg.content,
        }),
      });
    } finally {
      setSending(false);
    }
  };

  // Helper to get the other user's name for the header
  function getOtherUserName() {
    if (currentUserType === 'SINGLE') {
      return sponsorInfo?.name || 'Sponsor';
    } else {
      return singleInfo?.name || 'Single';
    }
  }

  // Helper: get the other user info for chat (sponsorInfo can be undefined during load)
  const otherUserInfo = currentUserType === 'SINGLE'
    ? (sponsorInfo && typeof sponsorInfo === 'object' ? sponsorInfo : singleInfo)
    : singleInfo;

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden p-0 sm:p-2 bg-white"
      style={{ paddingBottom: 'calc(var(--bottom-nav-h,0px) + env(safe-area-inset-bottom))' }}
    >
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 w-full bg-white/80 rounded-none shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <button 
              onClick={() => {
                // Check if we can go back in history
                if (window.history.length > 1) {
                  router.back();
                } else {
                  // Fallback to dashboard
                  router.push('/dashboard/matchmakr');
                }
              }} 
              className="text-primary-blue font-semibold text-base"
            >
              &larr; Back
            </button>
            {/* Avatar + Name + Subtitle */}
            {otherUserInfo && (
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent-teal-light flex-shrink-0">
                  {otherUserInfo.photo ? (
                    <img src={otherUserInfo.photo} alt={otherUserInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-background-main flex items-center justify-center">
                      <span className="text-sm font-bold text-text-light">{otherUserInfo.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {otherUserInfo.name || 'Chat'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentUserType === 'SINGLE' ? 'Your sponsor' : 'Your sponsored single'}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
      
      {/* Chat history */}
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-4 text-left">
          <div className="flex flex-col">
            {chatMessages.length > 0 && (
              <GroupedMessageList
                messages={chatMessages}
                currentUserId={currentUserId || ''}
                getAvatarUrl={(userId) => {
                  if (userId === currentUserInfo?.id) {
                    return currentUserInfo?.photo || null;
                  } else if (userId === otherUserInfo?.id) {
                    return otherUserInfo?.photo || null;
                  }
                  return null;
                }}
                getDisplayName={(userId) => {
                  if (userId === currentUserInfo?.id) {
                    return currentUserInfo?.name || null;
                  } else if (userId === otherUserInfo?.id) {
                    return otherUserInfo?.name || null;
                  }
                  return null;
                }}
              />
            )}
            {isTyping && (
              <div className="flex justify-end items-center my-4">
                <div className="max-w-[70%] flex flex-col items-end">
                  <div className="font-semibold text-primary-blue text-xs mb-1 text-right">
                    You
                  </div>
                  <div className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-500 italic">
                    typing...
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light ml-4 flex-shrink-0 flex items-center justify-center">
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-lg font-bold text-text-light">M</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-px" />
          </div>
      </div>
      
      {/* Input Section — non-fixed so keyboard shrinks viewport naturally */}
      <div className="z-30 bg-white border-t border-border-light px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base bg-white/90"
            placeholder={`Send a message to ${singleInfo?.name || 'your single'}`}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          {messageText.trim() && (
            <button
              className="flex items-center justify-center w-14 h-14 rounded-full bg-action-primary shadow-cta-entry hover:bg-action-primary-hover active:bg-action-primary-active transition-colors border-0 text-primary-blue"
              onClick={handleSendMessage}
              disabled={sending}
            >
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
                <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="currentColor"/>
              </svg>
            </button>
          )}
      </div>
    </div>
  );
} 