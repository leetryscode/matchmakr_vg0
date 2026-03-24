'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GroupedMessageList from '@/components/chat/GroupedMessageList';
import RequireStandaloneGate from '@/components/pwa/RequireStandaloneGate';
import { REQUIRE_STANDALONE_ENABLED } from '@/config/pwa';
import { SCROLL_PIN_THRESHOLD_PX } from '@/constants/chat';
import { useKeyboardScrollFix } from '@/hooks/useKeyboardScrollFix';
import { useRealtimeMessages } from '@/contexts/RealtimeMessagesContext';

export default function ChatPage() {
  const router = useRouter();
  const { conversationId } = useParams();
  const {
    registerConversation,
    unregisterConversation,
    notifySent,
    setActiveConversationId,
  } = useRealtimeMessages();
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const didInitialScrollRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInputFocusedRef = useRef<boolean>(false);

  const supabase = getSupabaseClient();
  
  // Match approval states
  const [matchStatus, setMatchStatus] = useState<'none' | 'pending' | 'matched' | 'can-approve'>('none');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const prevMatchStatus = useRef<string>('');

  // Register with global realtime provider for incoming messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const key = conversationId as string;

    const appendMessage = (newMessage: any) => {
      setChatMessages(prev => {
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (
            prev[i].optimistic &&
            prev[i].content === newMessage.content &&
            prev[i].sender_id === newMessage.sender_id
          ) {
            idx = i;
            break;
          }
        }
        if (idx === -1) return [...prev, newMessage];
        const copy = prev.slice();
        copy[idx] = newMessage;
        return copy;
      });
    };

    const onRefreshNeeded = async () => {
      try {
        const res = await fetch(`/api/messages/history?conversation_id=${conversationId}`);
        const data = await res.json();
        if (data.success && data.messages) setChatMessages(data.messages);
      } catch {
        // Silent
      }
    };

    registerConversation(key, appendMessage, onRefreshNeeded);
    setActiveConversationId(key);

    return () => {
      unregisterConversation(key);
      setActiveConversationId(null);
    };
  }, [conversationId, currentUserId]);

  // Fetch chat context and messages
  useEffect(() => {
    if (!conversationId) return;
    setChatLoading(true);
    const fetchChatData = async () => {
      // Fetch chat context
      const contextRes = await fetch(`/api/messages/chat-context?conversation_id=${conversationId}`);
      const contextData = await contextRes.json();
      setChatContext(contextData);
      // Fetch chat history
      const historyRes = await fetch(`/api/messages/history?conversation_id=${conversationId}`);
      const historyData = await historyRes.json();
      const messages = historyData.success && historyData.messages ? historyData.messages : [];
      setChatMessages(messages);
      setChatLoading(false);
    };
    fetchChatData();
  }, [conversationId]);

  // Fetch current user ID from Supabase Auth
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Mark messages as read as soon as chat is opened
  useEffect(() => {
    if (!chatContext || !currentUserId) return;
    const otherId = getOtherMatchmakrId();
    if (!otherId) return;
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: currentUserId, 
        otherId,
        conversationId: chatContext.conversation_id 
      }),
    });
  }, [chatContext, currentUserId]);

  const isNearBottomNow = () => {
    const c = chatContainerRef.current;
    if (!c) return true;
    const dist = c.scrollHeight - (c.scrollTop + c.clientHeight);
    return dist < SCROLL_PIN_THRESHOLD_PX;
  };

  // Helper to scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // Scroll to bottom if pinned — used by keyboard fix hook
  useKeyboardScrollFix(true, isInputFocusedRef, () => {
    if (isNearBottomNow()) requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom()));
  });

  // Reset initial scroll flag when conversation changes
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [conversationId]);

  // A) Initial load (force scroll once)
  useEffect(() => {
    if (!chatLoading && chatMessages.length > 0 && !didInitialScrollRef.current) {
      // Use two requestAnimationFrames to handle layout shifts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          didInitialScrollRef.current = true;
          shouldAutoScrollRef.current = true;
        });
      });
    }
  }, [chatLoading, chatMessages.length]);

  // B) New messages — only scroll if user is near bottom *now*
  useEffect(() => {
    if (!didInitialScrollRef.current || chatMessages.length === 0) return;
    if (!isNearBottomNow()) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [chatMessages.length]);

  // Handle scroll events to determine if we should auto-scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const near = isNearBottomNow();
      shouldAutoScrollRef.current = near;
      setShowScrollToBottom(!near);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);


  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Fetch match status when chat context is available
  useEffect(() => {
    if (chatContext?.currentUserSingle?.id && chatContext?.otherUserSingle?.id && currentUserId) {
      fetchMatchStatus();
    }
  }, [chatContext?.currentUserSingle?.id, chatContext?.otherUserSingle?.id, currentUserId]);



  // Helper to fetch match status
  const fetchMatchStatus = async () => {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const singleAId = chatContext.currentUserSingle.id;
      const singleBId = chatContext.otherUserSingle.id;
      
      if (!singleAId || !singleBId) {
        setMatchStatus('none');
        setMatchLoading(false);
        return;
      }
      
      const res = await fetch(`/api/matches/status?single_a_id=${singleAId}&single_b_id=${singleBId}&matchmakr_id=${currentUserId}`);
      const data = await res.json();
      if (data.success) {
        setMatchStatus(data.status); // 'can-approve', 'pending', 'matched'
      } else {
        setMatchStatus('can-approve');
      }
    } catch (e) {
      setMatchError('Match status couldn\'t be loaded. Please try again.');
    }
    setMatchLoading(false);
  };

  // Approve match handler
  const handleApproveMatch = async () => {
    setApprovalLoading(true);
    setMatchError(null);
    try {
      const singleAId = chatContext.currentUserSingle.id;
      const singleBId = chatContext.otherUserSingle.id;
      
      if (!singleAId || !singleBId) {
        setMatchError('Both singles must be present to make the introduction.');
        setApprovalLoading(false);
        return;
      }
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          single_a_id: singleAId,
          single_b_id: singleBId,
          matchmakr_id: currentUserId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        
        // Refetch the match status to get the correct state
        await fetchMatchStatus();
        setShowApprovalModal(false);
      } else {
        setMatchError('The introduction couldn\'t be made. Please try again.');
      }
    } catch (error) {
      setMatchError('The introduction couldn\'t be made. Please try again.');
    } finally {
      setApprovalLoading(false);
    }
  };

  // Helper to get the other MatchMakr's ID
  function getOtherMatchmakrId() {
    if (!chatContext || !currentUserId) return '';
    if (chatContext.initiatorProfile?.id === currentUserId) {
      return chatContext.recipientProfile?.id;
    } else {
      return chatContext.initiatorProfile?.id;
    }
  }

  // Helper to get the other MatchMakr's name
  function getOtherMatchmakrName() {
    if (!chatContext || !currentUserId) return 'Sponsor Chat';
    if (chatContext.initiatorProfile?.id === currentUserId) {
      return chatContext.recipientProfile?.name || 'Sponsor Chat';
    } else {
      return chatContext.initiatorProfile?.name || 'Sponsor Chat';
    }
  }

  // Helper to get the other sponsor's profile (for avatar)
  function getOtherMatchmakrProfile() {
    if (!chatContext || !currentUserId) return null;
    if (chatContext.initiatorProfile?.id === currentUserId) {
      return chatContext.recipientProfile;
    } else {
      return chatContext.initiatorProfile;
    }
  }

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatContext?.conversation_id || !currentUserId) return;
    const recipientId = getOtherMatchmakrId();
    setSending(true);
    const messageContent = messageText.trim();
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    // Add optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: currentUserId,
      conversation_id: chatContext.conversation_id,
      created_at: new Date().toISOString(),
      optimistic: true
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    // Explicit intent: after sending, user wants to be at the bottom
    shouldAutoScrollRef.current = true;
    setShowScrollToBottom(false);
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
          recipient_id: recipientId,
          content: messageContent,
          conversation_id: chatContext.conversation_id,
          about_single_id: chatContext.currentUserSingle?.id,
          clicked_single_id: chatContext.otherUserSingle?.id,
        }),
      });
      // Signal to the global provider: start 3-second fallback timer
      notifySent(chatContext.conversation_id);
    } catch (error) {
      setChatMessages(prev => prev.filter(msg => !msg.optimistic));
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <RequireStandaloneGate
      enabled={REQUIRE_STANDALONE_ENABLED}
      title="Install Orbit to access Chat"
      body="Chat is available in app mode only. Install Orbit for full access."
      showBackButton={true}
    >
    <div
      className="h-[100dvh] flex flex-col overflow-hidden p-0 sm:p-2 bg-orbit-surface3 overscroll-none"
      style={{ paddingBottom: 'calc(var(--bottom-nav-h,0px) + env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-orbit-surface3 border-b border-orbit-border/50 w-full shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <button 
                onClick={() => {
                  // Check if we can go back in history
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    // Fallback to dashboard with refresh parameter
                    router.push('/dashboard/matchmakr?refresh=true');
                  }
                }} 
                className="text-orbit-text font-semibold text-base"
              >
                &larr; Back
              </button>
              {/* Avatar + Name + Subtitle */}
              {(() => {
                const otherProfile = getOtherMatchmakrProfile();
                if (!otherProfile) return null;
                return (
                  <>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orbit-border flex-shrink-0">
                      {otherProfile.photo ? (
                        <img src={otherProfile.photo} alt={otherProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-orbit-canvas flex items-center justify-center">
                          <span className="text-sm font-bold text-orbit-text2">{otherProfile.name?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-orbit-text truncate">
                        {otherProfile.name || 'Sponsor Chat'}
                      </div>
                      <div className="text-xs text-orbit-muted truncate">Sponsor</div>
                    </div>
                  </>
                );
              })()}
            </div>

          {/* Compact singles context row */}
          {chatContext && (
            <div className="px-4 py-1.5 border-b border-orbit-border/50 bg-orbit-surface3 flex items-center gap-3">
              {/* Left: Overlapping avatars */}
              <div className="flex items-center">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orbit-border ring-2 ring-orbit-surface3 flex-shrink-0">
                  {chatContext.otherUserSingle?.photo ? (
                    <img src={chatContext.otherUserSingle.photo} alt={chatContext.otherUserSingle.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orbit-canvas flex items-center justify-center">
                      <span className="text-sm font-bold text-orbit-text2">{chatContext.otherUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orbit-border ring-2 ring-orbit-surface3 -ml-2 flex-shrink-0">
                  {chatContext.currentUserSingle?.photo ? (
                    <img src={chatContext.currentUserSingle.photo} alt={chatContext.currentUserSingle.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orbit-canvas flex items-center justify-center">
                      <span className="text-sm font-bold text-orbit-text2">{chatContext.currentUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle: Singles names */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-orbit-muted">Discussing</div>
                <div className="text-sm font-medium text-orbit-text truncate">
                  {chatContext.otherUserSingle?.name || 'Unknown'} • {chatContext.currentUserSingle?.name || 'Unknown'}
                </div>
              </div>
              
              {/* Right: Approve Match button/status */}
              <div className="flex-shrink-0">
                {matchLoading ? (
                  <div className="text-xs text-orbit-muted whitespace-nowrap">Checking...</div>
                ) : matchStatus === 'matched' ? (
                  <div className="text-xs text-orbit-gold font-semibold whitespace-nowrap">Both sponsors agreed to the introduction</div>
                ) : matchStatus === 'pending' ? (
                  <div className="text-xs text-orbit-warning font-semibold whitespace-nowrap">Waiting for the other sponsor</div>
                ) : matchStatus === 'can-approve' ? (
                  <button
                    className="orbit-btn-primary h-10 min-h-[44px] px-4 text-sm rounded-cta shadow-cta-entry hover:opacity-90 active:opacity-95 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    onClick={() => setShowApprovalModal(true)}
                    disabled={!chatContext.currentUserSingle?.id || !chatContext.otherUserSingle?.id || matchLoading}
                    title={!chatContext.currentUserSingle?.id || !chatContext.otherUserSingle?.id ? 'Both singles must be present to make the introduction.' : ''}
                  >
                    Make the introduction
                  </button>
                ) : null}
                {matchError && <div className="text-xs text-orbit-warning mt-1 whitespace-nowrap">{matchError}</div>}
              </div>
            </div>
          )}
      </div>
      
      {/* Scrollable chat area */}
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-4 text-left bg-orbit-canvas relative" onClick={() => textareaRef.current?.blur()}>
          <div className="flex flex-col">
            {chatMessages.length > 0 && (
              <GroupedMessageList
                messages={chatMessages}
                currentUserId={currentUserId || ''}
                getAvatarUrl={(userId) => {
                  if (userId === chatContext?.initiatorProfile?.id) {
                    return chatContext.initiatorProfile?.photo || null;
                  } else if (userId === chatContext?.recipientProfile?.id) {
                    return chatContext.recipientProfile?.photo || null;
                  }
                  return null;
                }}
                getDisplayName={(userId) => {
                  if (userId === chatContext?.initiatorProfile?.id) {
                    return chatContext.initiatorProfile?.name || null;
                  } else if (userId === chatContext?.recipientProfile?.id) {
                    return chatContext.recipientProfile?.name || null;
                  }
                  return null;
                }}
              />
            )}
            <div ref={bottomRef} className="h-px" />
          </div>

          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                shouldAutoScrollRef.current = true;
                setShowScrollToBottom(false);
              }}
              className="absolute bottom-4 right-4 bg-orbit-gold text-orbit-text rounded-full p-3 shadow-lg hover:opacity-90 transition-opacity duration-200 z-10"
              title="Scroll to bottom"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
      </div>
      
      {/* Input Section — non-fixed so keyboard shrinks viewport naturally */}
      <div className="z-30 bg-orbit-surface3 border-t border-orbit-border/50 px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 border border-orbit-border/50 rounded-2xl px-4 py-4 text-orbit-text bg-orbit-surface/80 focus:border-orbit-gold focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 placeholder:text-orbit-muted placeholder:italic text-base resize-none max-h-[7.5rem] overflow-y-auto leading-normal"
            placeholder={`Send a message`}
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

      {/* Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-orbit-canvas/80 flex items-center justify-center z-[9999]">
          <div className="bg-orbit-surface3 rounded-2xl p-8 shadow-xl max-w-md w-full mx-4 text-center">
            <h3 className="type-section mb-4 text-orbit-text">Make the introduction?</h3>
            <p className="mb-6 text-orbit-text2">When both sponsors agree, the singles will be connected.</p>
            <div className="flex gap-4 justify-center">
              <button
                className="orbit-btn-secondary px-6 py-2 rounded-md font-semibold"
                onClick={() => setShowApprovalModal(false)}
                disabled={approvalLoading}
              >
                Cancel
              </button>
              <button
                className="orbit-btn-primary rounded-cta px-6 py-2 min-h-[44px] shadow-cta-entry hover:opacity-90 active:opacity-95 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleApproveMatch}
                disabled={approvalLoading}
              >
                {approvalLoading ? 'Making the introduction...' : 'Make the introduction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireStandaloneGate>
  );
} 