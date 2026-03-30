'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GroupedMessageList from '@/components/chat/GroupedMessageList';
import { SCROLL_PIN_THRESHOLD_PX } from '@/constants/chat';
import { useKeyboardScrollFix } from '@/hooks/useKeyboardScrollFix';
import { useRealtimeMessages } from '@/contexts/RealtimeMessagesContext';

export default function SingleChatPage() {
  const router = useRouter();
  const { singleId } = useParams();
  const {
    registerConversation,
    unregisterConversation,
    notifySent,
    getDirectKey,
  } = useRealtimeMessages();
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInputFocusedRef = useRef<boolean>(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const supabase = getSupabaseClient();

  // Coerce singleId from useParams() to string (it can be string | string[])
  const singleIdStr = Array.isArray(singleId) ? singleId[0] : singleId as string;

  // Stable otherId — gate until we can disambiguate (SINGLE + sponsorInfo unknown = don't guess)
  const resolvedOtherId = useMemo(() => {
    if (!singleIdStr) return null;
    if (currentUserType !== 'SINGLE') return singleIdStr;

    if (sponsorInfo === undefined) return null;
    return sponsorInfo?.id ?? singleIdStr;
  }, [singleIdStr, currentUserType, sponsorInfo]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const isNearBottomNow = () => {
    const c = chatContainerRef.current;
    if (!c) return true;
    const dist = c.scrollHeight - (c.scrollTop + c.clientHeight);
    return dist < SCROLL_PIN_THRESHOLD_PX;
  };

  // Scroll to bottom if pinned — used by keyboard fix hook
  useKeyboardScrollFix(true, isInputFocusedRef, () => {
    if (isNearBottomNow()) requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom()));
  });

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
    if (!singleIdStr || !currentUserId || !resolvedOtherId) return;

    setChatLoading(true);
    const fetchChatData = async () => {
      const { data: singleData } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('id', singleIdStr)
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
      const messages = historyData.success && historyData.messages ? historyData.messages : [];
      setChatMessages(messages);
      setChatLoading(false);

      if (currentUserType === 'SINGLE' && !sponsorInfo?.id) {
        const conversationKey = `firstChat_${currentUserId}_${singleIdStr}`;
        const hasOpenedBefore = localStorage.getItem(conversationKey);
        if (!hasOpenedBefore) {
          localStorage.setItem(conversationKey, 'true');
        }
      }
    };
    fetchChatData();
  }, [singleIdStr, currentUserId, resolvedOtherId, currentUserType, sponsorInfo?.id]);

  // Mark messages as read as soon as chat is opened
  useEffect(() => {
    if (!singleIdStr || !currentUserId || !resolvedOtherId) return;
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, otherId: resolvedOtherId }),
    });
  }, [singleIdStr, currentUserId, resolvedOtherId]);

  // Reset initial scroll flag when conversation changes
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [singleIdStr]);

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

  // Scroll listener to show/hide back-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const near = isNearBottomNow();
      setShowScrollToBottom(!near);
      if (near) setNewMessageCount(0);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // New messages — scroll if near bottom, or show indicator if not
  useEffect(() => {
    if (!didInitialScrollRef.current || chatMessages.length === 0) return;
    if (isNearBottomNow()) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    } else {
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg && lastMsg.sender_id !== currentUserId && !lastMsg.optimistic) {
        setNewMessageCount(prev => prev + 1);
      }
    }
  }, [chatMessages.length]);


  // Register with global realtime provider — guard until resolvedOtherId exists (avoids sponsorInfo race)
  useEffect(() => {
    if (!currentUserId || !resolvedOtherId) return;

    const key = getDirectKey(currentUserId, resolvedOtherId);

    const appendMessage = (newMessage: any) => {
      setChatMessages(prev => {
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (!prev[i].optimistic) continue;
          const matchById = newMessage.client_message_id && prev[i].client_message_id === newMessage.client_message_id;
          const matchByContent = !newMessage.client_message_id && prev[i].content === newMessage.content && prev[i].sender_id === newMessage.sender_id;
          if (matchById || matchByContent) { idx = i; break; }
        }
        if (idx === -1) return [...prev, newMessage];
        const copy = prev.slice();
        copy[idx] = newMessage;
        return copy;
      });
    };

    const onRefreshNeeded = async () => {
      try {
        const res = await fetch(`/api/messages/history?userId=${currentUserId}&otherId=${resolvedOtherId}`);
        const data = await res.json();
        if (data.success && data.messages) setChatMessages(data.messages);
      } catch {
        // Silent
      }
    };

    registerConversation(key, appendMessage, onRefreshNeeded);

    return () => {
      unregisterConversation(key);
    };
  }, [currentUserId, resolvedOtherId, getDirectKey]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !singleIdStr || !currentUserId || !resolvedOtherId) return;
    setSending(true);

    const clientMsgId = crypto.randomUUID();
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      client_message_id: clientMsgId,
      sender_id: currentUserId,
      recipient_id: resolvedOtherId,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    // Explicit intent: after sending, user wants to be at the bottom
    setShowScrollToBottom(false);
    setNewMessageCount(0);
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
          client_message_id: clientMsgId,
        }),
      });
      notifySent(getDirectKey(currentUserId, resolvedOtherId));
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
      className="h-[100dvh] flex flex-col overflow-hidden p-0 sm:p-2 bg-orbit-surface3 overscroll-none"
      style={{ paddingBottom: 'calc(var(--bottom-nav-h,0px) + env(safe-area-inset-bottom))' }}
    >
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-orbit-surface3 border-b border-orbit-border/50 w-full rounded-none shadow-2xl">
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
              className="text-orbit-text font-semibold text-base"
            >
              &larr; Back
            </button>
            {/* Avatar + Name + Subtitle */}
            {otherUserInfo && (
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orbit-border flex-shrink-0">
                  {otherUserInfo.photo ? (
                    <img src={otherUserInfo.photo} alt={otherUserInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orbit-canvas flex items-center justify-center">
                      <span className="text-sm font-bold text-orbit-text2">{otherUserInfo.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-orbit-text truncate">
                    {otherUserInfo.name || 'Chat'}
                  </div>
                  <div className="text-xs text-orbit-muted truncate">
                    {currentUserType === 'SINGLE' ? 'Your sponsor' : 'Your sponsored single'}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
      
      {/* Chat history */}
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-4 text-left bg-orbit-canvas relative" onClick={() => textareaRef.current?.blur()}>
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
            <div ref={bottomRef} className="h-px" />
          </div>

          {/* Scroll to bottom button + new message indicator */}
          {showScrollToBottom && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                setShowScrollToBottom(false);
                setNewMessageCount(0);
              }}
              className="absolute bottom-4 right-4 flex flex-col items-end gap-1 z-10"
              title="Scroll to bottom"
            >
              {newMessageCount > 0 && (
                <span className="bg-orbit-gold text-orbit-canvas text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                  New message
                </span>
              )}
              <span className="bg-orbit-surface3 text-orbit-gold rounded-full p-2 shadow-lg hover:opacity-90 transition-opacity duration-200 flex items-center justify-center border border-orbit-border/50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
          )}
      </div>
      
      {/* Input Section — non-fixed so keyboard shrinks viewport naturally */}
      <div className="z-30 bg-orbit-surface3 border-t border-orbit-border/50 px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 border border-orbit-border/50 rounded-2xl px-4 py-4 text-orbit-text bg-orbit-surface/80 focus:border-orbit-gold focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 placeholder:text-orbit-muted placeholder:italic text-base resize-none max-h-[7.5rem] overflow-y-auto leading-normal"
            placeholder={`Send a message to ${singleInfo?.name || 'your single'}`}
            value={messageText}
            onChange={e => {
              setMessageText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onFocus={() => { isInputFocusedRef.current = true; }}
            onBlur={() => { isInputFocusedRef.current = false; }}
            disabled={sending}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
            }}
          />
          <button
            className={`flex items-center justify-center w-14 h-14 rounded-full bg-orbit-gold text-orbit-text shadow-cta-entry hover:opacity-90 active:opacity-95 transition-opacity border-0 flex-shrink-0 ${!messageText.trim() ? 'opacity-0 pointer-events-none' : ''}`}
            onClick={handleSendMessage}
            disabled={sending}
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
              <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="currentColor"/>
            </svg>
          </button>
      </div>
    </div>
  );
} 