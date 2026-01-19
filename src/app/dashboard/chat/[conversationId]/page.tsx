'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import GroupedMessageList from '@/components/chat/GroupedMessageList';
import RequireStandaloneGate from '@/components/pwa/RequireStandaloneGate';

export default function ChatPage() {
  const router = useRouter();
  const { conversationId } = useParams();
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const didInitialScrollRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const supabase = getSupabaseClient();
  const channelRef = useRef<any>(null); // Track channel to prevent double-subscribe
  const instanceIdRef = useRef<string>(`chat-${conversationId}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Match approval states
  const [matchStatus, setMatchStatus] = useState<'none' | 'pending' | 'matched' | 'can-approve'>('none');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const prevMatchStatus = useRef<string>('');

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return; // Guard against auth transitions
    
    const channelName = `messages-${conversationId}`;
    const instanceId = instanceIdRef.current;
    
    console.log(`[REALTIME-DEBUG] ${instanceId} | ChatPage | SUBSCRIBE | channel: ${channelName}`);
    
    // Cleanup previous channel if exists (guard against double-subscribe)
    if (channelRef.current) {
      console.log(`[REALTIME-DEBUG] ${instanceId} | ChatPage | CLEANUP-PREV | channel: ${channelName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new;
        console.log('Realtime message received:', newMessage);
        // If the new message belongs to this conversation, add it to chatMessages
        if (newMessage.conversation_id === conversationId) {
          console.log('Adding message to chat:', newMessage);
          setChatMessages(prev => {
            // Filter out any optimistic messages with the same content
            const filteredPrev = prev.filter(msg => !msg.optimistic || msg.content !== newMessage.content);
            return [...filteredPrev, newMessage];
          });
          
          // Clear any pending fallback timeout since we got the real message
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
        }
      })
      .subscribe((status) => {
        console.log(`[REALTIME-DEBUG] ${instanceId} | ChatPage | SUBSCRIBE-STATUS | channel: ${channelName} | status: ${status}`);
      });
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        console.log(`[REALTIME-DEBUG] ${instanceId} | ChatPage | CLEANUP | channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId]); // supabase is singleton, stable

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
      setChatMessages(historyData.success && historyData.messages ? historyData.messages : []);
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

  // Helper to scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

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

  // B) New messages (respect shouldAutoScrollRef)
  useEffect(() => {
    if (didInitialScrollRef.current && shouldAutoScrollRef.current && chatMessages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [chatMessages.length]);

  // Handle scroll events to determine if we should auto-scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // If user is near the bottom (within 50px), enable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldAutoScrollRef.current = isNearBottom;
      setShowScrollToBottom(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  // Set a flag to refresh dashboard when leaving this page
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('chatPageVisited', 'true');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set the flag when component unmounts (user navigates away)
      sessionStorage.setItem('chatPageVisited', 'true');
    };
  }, []);

  // Add typing indicator state
  const [isTyping, setIsTyping] = useState(false);
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
      
      // Set up fallback refetch if realtime doesn't work
      fallbackTimeoutRef.current = setTimeout(async () => {
        // Check if the message appeared via realtime
        const hasRealMessage = chatMessages.some(msg => 
          !msg.optimistic && 
          msg.content === messageContent && 
          msg.sender_id === currentUserId
        );
        
        if (!hasRealMessage) {
          console.log('Message not received via realtime, refetching...');
          // Refetch messages
          const historyRes = await fetch(`/api/messages/history?conversation_id=${conversationId}`);
          const historyData = await historyRes.json();
          if (historyData.success && historyData.messages) {
            setChatMessages(historyData.messages);
          }
        }
      }, 2000); // Wait 2 seconds for realtime
      
    } catch (error) {
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(msg => !msg.optimistic));
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <RequireStandaloneGate
      enabled={true}
      title="Install Orbit to access Chat"
      body="Chat is available in app mode only. Install Orbit for full access."
      showBackButton={true}
      backRoute="/dashboard"
    >
    <div className="h-[100dvh] flex flex-col p-0 sm:p-2 bg-white">
      {/* Fixed header section */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm w-full bg-white/80 rounded-none shadow-2xl">
          {/* New sticky top bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
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
                className="text-primary-blue font-semibold text-base"
              >
                &larr; Back
              </button>
              {/* Avatar + Name + Subtitle */}
              {(() => {
                const otherProfile = getOtherMatchmakrProfile();
                if (!otherProfile) return null;
                return (
                  <>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent-teal-light flex-shrink-0">
                      {otherProfile.photo ? (
                        <img src={otherProfile.photo} alt={otherProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-sm font-bold text-text-light">{otherProfile.name?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {otherProfile.name || 'Sponsor Chat'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">Sponsor</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Compact singles context row - sticky below top bar */}
          {chatContext && (
            <div className="px-4 py-1.5 border-b bg-white flex items-center gap-3">
              {/* Left: Overlapping avatars */}
              <div className="flex items-center">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-accent-teal-light ring-2 ring-white flex-shrink-0">
                  {chatContext.otherUserSingle?.photo ? (
                    <img src={chatContext.otherUserSingle.photo} alt={chatContext.otherUserSingle.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-background-main flex items-center justify-center">
                      <span className="text-sm font-bold text-text-light">{chatContext.otherUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-accent-teal-light ring-2 ring-white -ml-2 flex-shrink-0">
                  {chatContext.currentUserSingle?.photo ? (
                    <img src={chatContext.currentUserSingle.photo} alt={chatContext.currentUserSingle.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-background-main flex items-center justify-center">
                      <span className="text-sm font-bold text-text-light">{chatContext.currentUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle: Singles names */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-400">Discussing</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {chatContext.otherUserSingle?.name || 'Unknown'} • {chatContext.currentUserSingle?.name || 'Unknown'}
                </div>
              </div>
              
              {/* Right: Approve Match button/status */}
              <div className="flex-shrink-0">
                {matchLoading ? (
                  <div className="text-xs text-gray-500 whitespace-nowrap">Checking...</div>
                ) : matchStatus === 'matched' ? (
                  <div className="text-xs text-primary-blue font-semibold whitespace-nowrap">Both sponsors agreed to the introduction</div>
                ) : matchStatus === 'pending' ? (
                  <div className="text-xs text-yellow-600 font-semibold whitespace-nowrap">Waiting for the other sponsor</div>
                ) : matchStatus === 'can-approve' ? (
                  <button
                    className="h-8 px-4 text-sm bg-gradient-primary text-white rounded-lg font-semibold shadow-button hover:shadow-button-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    onClick={() => setShowApprovalModal(true)}
                    disabled={!chatContext.currentUserSingle?.id || !chatContext.otherUserSingle?.id || matchLoading}
                    title={!chatContext.currentUserSingle?.id || !chatContext.otherUserSingle?.id ? 'Both singles must be present to make the introduction.' : ''}
                  >
                    Make the introduction
                  </button>
                ) : null}
                {matchError && <div className="text-xs text-red-500 mt-1 whitespace-nowrap">{matchError}</div>}
              </div>
            </div>
          )}
      </div>
      
      {/* Scrollable chat area */}
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-4 pb-[140px] text-left bg-white relative">
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
          </div>
          <div ref={bottomRef} />
          {/* Typing indicator - show on right side for current user */}
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

          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <button
              onClick={() => {
                scrollToBottom('smooth');
                shouldAutoScrollRef.current = true;
                setShowScrollToBottom(false);
              }}
              className="absolute bottom-4 right-4 bg-primary-blue text-white rounded-full p-3 shadow-lg hover:bg-primary-blue-dark transition-all duration-200 z-10"
              title="Scroll to bottom"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
      </div>
      
      {/* Input Section */}
      <div className="fixed left-0 right-0 bottom-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom))] z-30 bg-white border-t border-border-light px-4 py-4 flex items-center gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base bg-white/90"
            placeholder={`Send a message`}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          {messageText.trim() && (
            <button
              className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-blue-light to-accent-teal-light shadow-md hover:scale-105 transition-transform border-2 border-border-light text-white"
              onClick={handleSendMessage}
              disabled={sending}
            >
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
                <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="currentColor"/>
              </svg>
            </button>
          )}
      </div>
      
      {/* Bottom spacer for bottom nav */}
      <div className="h-[var(--bottom-nav-h,0px)]" aria-hidden="true" />
      
      {/* Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4 text-center">
            <h3 className="type-section mb-4 text-primary-blue">Make the introduction?</h3>
            <p className="mb-6 text-gray-600">When both sponsors agree, the singles will be connected.</p>
            <div className="flex gap-4 justify-center">
              <button
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300"
                onClick={() => setShowApprovalModal(false)}
                disabled={approvalLoading}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-gradient-primary text-white rounded-md font-semibold hover:bg-gradient-light transition-all duration-300 shadow-button hover:shadow-button-hover disabled:opacity-50"
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