"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserProfilePic?: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserProfilePic?: string | null;
  aboutSingle: { id: string; name: string; photo?: string | null };
  clickedSingle: { id: string; name: string; photo?: string | null };
  isSingleToSingle?: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, currentUserId, currentUserName, currentUserProfilePic, otherUserId, otherUserName, otherUserProfilePic, aboutSingle, clickedSingle, isSingleToSingle = false }) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCount = useRef<number>(0);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [matchStatus, setMatchStatus] = useState<'none' | 'pending' | 'matched' | 'can-approve'>('none');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [canChatLoading, setCanChatLoading] = useState(false);
  const prevMatchStatus = useRef<string>('');
  const [chatContext, setChatContext] = useState<{
    currentUserSingle: { id: string; name: string; photo: string | null } | null;
    otherUserSingle: { id: string; name: string; photo: string | null } | null;
    conversation_id?: string;
  } | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [currentUserSingles, setCurrentUserSingles] = useState<{ id: string }[]>([]);

  // Fetch chat history and context
  useEffect(() => {
    if (!open) return;
    
    // Debug: Log the props to verify correct context
    console.log('ChatModal: Fetching chat data with context:', {
      currentUserId,
      otherUserId,
      aboutSingle: aboutSingle?.id,
      clickedSingle: clickedSingle?.id,
      isSingleToSingle
    });
    
    let isMounted = true;
    const fetchChatData = async () => {
      setChatLoading(true);
      setContextLoading(true);
      setShowSpinner(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      loadingTimeout.current = setTimeout(() => {
        if (isMounted) setShowSpinner(true);
      }, 200);
      
      let conversationId = null;
      let contextData = null;
      
      // For MatchMakr-to-MatchMakr chats, get context and conversation_id first
      if (!isSingleToSingle) {
        let contextUrl = `/api/messages/chat-context?userId=${currentUserId}&otherId=${otherUserId}`;
        if (aboutSingle?.id && clickedSingle?.id) {
          contextUrl += `&about_single_id=${aboutSingle.id}&clicked_single_id=${clickedSingle.id}`;
        }
        const contextRes = await fetch(contextUrl);
        contextData = await contextRes.json();
        if (contextData?.success) {
          conversationId = contextData.conversation_id;
        }
      }
      
      // Fetch chat history with conversation_id if available, or filter by singles if no conversation exists
      let historyUrl = `/api/messages/history?userId=${currentUserId}&otherId=${otherUserId}`;
      if (conversationId) {
        historyUrl += `&conversation_id=${conversationId}`;
      } else if (!isSingleToSingle && aboutSingle?.id && clickedSingle?.id) {
        // If no conversation exists, filter by the specific singles to ensure isolation
        historyUrl += `&about_single_id=${aboutSingle.id}&clicked_single_id=${clickedSingle.id}`;
      }
      const historyRes = await fetch(historyUrl);
      const historyData = await historyRes.json();
      
      if (isMounted) {
        setChatMessages(historyData.success && historyData.messages ? historyData.messages : []);
        setChatContext(contextData?.success ? contextData : null);
        setChatLoading(false);
        setContextLoading(false);
        setShowSpinner(false);
      }
    };
    fetchChatData();
    return () => {
      isMounted = false;
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    };
  }, [open, currentUserId, otherUserId, isSingleToSingle, aboutSingle?.id, clickedSingle?.id]);

  // Always scroll to bottom when new messages arrive or modal opens
  useEffect(() => {
    if (!open) return;
    const container = chatContainerRef.current;
    if (container) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }, [chatMessages, open, chatLoading]);

  // Fetch match status for the two singles
  useEffect(() => {
    if (isSingleToSingle) {
      fetchMatchStatus();
    } else if (chatContext?.currentUserSingle?.id && chatContext?.otherUserSingle?.id) {
      fetchMatchStatus();
    }
    // eslint-disable-next-line
  }, [
    chatContext?.currentUserSingle?.id ?? '',
    chatContext?.otherUserSingle?.id ?? '',
    aboutSingle?.id ?? '',
    clickedSingle?.id ?? '',
    currentUserId ?? '',
    isSingleToSingle
  ]);

  // Check if singles can chat (for single-to-single chats)
  useEffect(() => {
    if (isSingleToSingle && aboutSingle.id && clickedSingle.id) {
      checkCanChat();
    }
  }, [isSingleToSingle, aboutSingle.id, clickedSingle.id]);

  // Helper to check if singles can chat
  const checkCanChat = async () => {
    setCanChatLoading(true);
    try {
      const res = await fetch(`/api/matches/can-chat?single_a_id=${aboutSingle.id}&single_b_id=${clickedSingle.id}`);
      const data = await res.json();
      if (data.success) {
        setCanChat(data.canChat);
      } else {
        setCanChat(false);
      }
    } catch (e) {
      setCanChat(false);
    }
    setCanChatLoading(false);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!currentUserId || !otherUserId || !messageText.trim()) return;
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: otherUserId,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    setSending(true);
    try {
      const messageData: any = {
        sender_id: currentUserId,
        recipient_id: otherUserId,
        content: optimisticMsg.content,
      };
      // Add about_single_id and clicked_single_id for MatchMakr-to-MatchMakr chat
      if (!isSingleToSingle && aboutSingle.id && clickedSingle.id) {
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

  // Approve match handler
  const handleApproveMatch = async () => {
    setMatchLoading(true);
    setMatchError(null);
    try {
      let singleAId, singleBId;
      if (isSingleToSingle) {
        singleAId = aboutSingle.id;
        singleBId = clickedSingle.id;
      } else {
        singleAId = chatContext?.currentUserSingle?.id;
        singleBId = chatContext?.otherUserSingle?.id;
      }
      
      if (!singleAId || !singleBId) {
        setMatchError('Both singles must be present to approve a match.');
        setMatchLoading(false);
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
        setMatchStatus('matched');
      } else {
        setMatchError('Failed to approve match');
      }
    } catch (error) {
      setMatchError('Failed to approve match');
    } finally {
      setMatchLoading(false);
    }
  };

  // Helper to fetch match status
  const fetchMatchStatus = async () => {
    setMatchLoading(true);
    setMatchError(null);
    try {
      let singleAId, singleBId;
      if (isSingleToSingle) {
        singleAId = aboutSingle.id;
        singleBId = clickedSingle.id;
      } else {
        singleAId = chatContext?.currentUserSingle?.id;
        singleBId = chatContext?.otherUserSingle?.id;
      }
      
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
      setMatchError('Failed to fetch match status');
    }
    setMatchLoading(false);
  };



  // Mark messages as read when modal opens
  useEffect(() => {
    if (!open) return;
    const markAsRead = async () => {
      // Get conversation_id from chat context if available
      let conversationId = null;
      if (!isSingleToSingle && chatContext?.conversation_id) {
        conversationId = chatContext.conversation_id;
      }
      
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          otherId: otherUserId,
          conversationId: conversationId,
        }),
      });
    };
    markAsRead();
  }, [open, currentUserId, otherUserId, chatContext?.conversation_id, isSingleToSingle]);

  // Fetch current user's sponsored singles for display logic
  useEffect(() => {
    async function fetchSingles() {
      if (!currentUserId) return;
      const res = await fetch(`/api/profiles/${currentUserId}/interests`); // Use a real endpoint for singles
      // For now, just set empty array if not available
      setCurrentUserSingles([]);
    }
    fetchSingles();
  }, [currentUserId]);

  // If the modal is open but the required data is not yet loaded, show a loading spinner
  if (open && (isSingleToSingle ? (!aboutSingle || !clickedSingle) : (!chatContext || contextLoading))) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-2xl p-8 shadow-xl w-[400px] text-center">
                          <div className="text-xl font-light mb-4 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>LOADING...</div>
          <div className="flex justify-center items-center mt-4">
            <svg className="animate-spin h-8 w-8 text-primary-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  // Helper to determine which single is 'ours' and which is 'theirs'
  function getChatSingles(currentUserId: string, chatContext: any, currentUserSingles: { id: string }[]) {
    // If aboutSingle and clickedSingle props are provided, use them
    if (aboutSingle?.id && clickedSingle?.id) {
      // For MatchMakr-to-MatchMakr chats, determine "Our Single" and "Their Single" based on conversation context
      if (chatContext?.currentUserSingle && chatContext?.otherUserSingle) {
        // Use the chat context to determine which single belongs to which user
        const currentUserSingleId = chatContext.currentUserSingle.id;
        const otherUserSingleId = chatContext.otherUserSingle.id;
        
        // Determine which single belongs to the current user
        if (currentUserSingles && currentUserSingles.some(s => s.id === currentUserSingleId)) {
          // Current user sponsors the currentUserSingle
          return {
            ourSingle: chatContext.currentUserSingle,
            theirSingle: chatContext.otherUserSingle
          };
        } else if (currentUserSingles && currentUserSingles.some(s => s.id === otherUserSingleId)) {
          // Current user sponsors the otherUserSingle
          return {
            ourSingle: chatContext.otherUserSingle,
            theirSingle: chatContext.currentUserSingle
          };
        }
      }
      
      // Fallback: determine based on which single the current user sponsors
      if (currentUserSingles && currentUserSingles.some(s => s.id === aboutSingle.id)) {
        return {
          ourSingle: aboutSingle,
          theirSingle: clickedSingle
        };
      } else if (currentUserSingles && currentUserSingles.some(s => s.id === clickedSingle.id)) {
        return {
          ourSingle: clickedSingle,
          theirSingle: aboutSingle
        };
      } else {
        // Fallback: assume aboutSingle is 'ours' and clickedSingle is 'theirs'
        return {
          ourSingle: aboutSingle,
          theirSingle: clickedSingle
        };
      }
    }
    
    // Fallback to chatContext logic
    if (!chatContext) return { ourSingle: { id: '', name: '', photo: null }, theirSingle: { id: '', name: '', photo: null } };
    // If the current user sponsors currentUserSingle, that's ours
    if (currentUserSingles && currentUserSingles.some(s => s.id === chatContext.currentUserSingle?.id)) {
      return {
        ourSingle: chatContext.currentUserSingle || { id: '', name: '', photo: null },
        theirSingle: chatContext.otherUserSingle || { id: '', name: '', photo: null }
      };
    }
    // If the current user sponsors otherUserSingle, that's ours
    if (currentUserSingles && currentUserSingles.some(s => s.id === chatContext.otherUserSingle?.id)) {
      return {
        ourSingle: chatContext.otherUserSingle || { id: '', name: '', photo: null },
        theirSingle: chatContext.currentUserSingle || { id: '', name: '', photo: null }
      };
    }
    // Fallback: just return as is
    return {
      ourSingle: chatContext.currentUserSingle || { id: '', name: '', photo: null },
      theirSingle: chatContext.otherUserSingle || { id: '', name: '', photo: null }
    };
  }

  const { ourSingle, theirSingle } = getChatSingles(currentUserId, chatContext, currentUserSingles);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl p-0 shadow-xl w-[600px] h-[800px] flex flex-col text-center relative">
        {/* Header/About Section */}
        <div className="p-8 border-b border-border-light">
          {isSingleToSingle ? (
            <>
              <div className="text-xl font-light mb-4 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>YOUR CONVERSATION WITH <span className="italic text-primary-blue-light">{otherUserName}</span></div>
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                    {aboutSingle.photo ? (
                      <img src={aboutSingle.photo} alt={aboutSingle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-2xl font-bold text-text-light">{aboutSingle.name?.charAt(0).toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-dark">{aboutSingle.name}</div>
                </div>
                <div className="text-lg font-medium text-text-light">and</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                    {clickedSingle.photo ? (
                      <img src={clickedSingle.photo} alt={clickedSingle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-2xl font-bold text-text-light">{clickedSingle.name?.charAt(0).toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-dark">{clickedSingle.name}</div>
                </div>
              </div>
              {/* Single-to-Single Chat Status */}
              <div className="mt-6">
                {canChatLoading ? (
                  <div className="text-gray-500">Checking if you can chat...</div>
                ) : canChat ? (
                  <div className="text-primary-blue font-bold">✨ You can chat! Both sponsors have approved your match.</div>
                ) : (
                  <div className="text-yellow-600 font-semibold">⏳ Waiting for both sponsors to approve your match...</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-light mb-4 tracking-[0.05em] uppercase" style={{ fontFamily: "'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>YOUR CONVERSATION WITH <span className="italic text-primary-blue-light">{otherUserName}</span></div>
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                    {theirSingle?.photo ? (
                      <img src={theirSingle.photo} alt={theirSingle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-2xl font-bold text-text-light">{theirSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  {/* Removed 'Their Single' text */}
                  <div className="text-xs text-gray-500">{theirSingle?.name || 'Unknown'}</div>
                </div>
                <div className="text-lg font-medium text-text-light">and</div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                    {ourSingle?.photo ? (
                      <img src={ourSingle.photo} alt={ourSingle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-2xl font-bold text-text-light">{ourSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  {/* Removed 'Our Single' text */}
                  <div className="text-xs text-gray-500">{ourSingle?.name || 'Unknown'}</div>
                </div>
              </div>
              {/* Approve Match UI for matchmakrs in chats about two singles */}
              <div className="mt-6">
                {matchLoading ? (
                  <div className="text-gray-500">Checking match status...</div>
                ) : matchStatus === 'matched' ? (
                  <div className="text-primary-blue font-bold">It's a Match! Both sponsors have approved.</div>
                ) : matchStatus === 'pending' ? (
                  <div className="text-yellow-600 font-semibold">Pending approval from the other sponsor...</div>
                ) : matchStatus === 'can-approve' ? (
                  <button
                    className="px-6 py-2 bg-gradient-primary text-white rounded-full font-semibold shadow-button hover:shadow-button-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleApproveMatch}
                    disabled={!ourSingle?.id || !theirSingle?.id || matchLoading}
                    title={!ourSingle?.id || !theirSingle?.id ? 'Both singles must be present to approve a match.' : ''}
                  >
                    Approve Match
                  </button>
                ) : null}
                {(!ourSingle?.id || !theirSingle?.id) && !isSingleToSingle && (
                  <div className="text-gray-400 text-xs mt-2">Both singles must be present to approve a match.</div>
                )}
                {matchError && <div className="text-red-500 mt-2">{matchError}</div>}
              </div>
            </>
          )}
        </div>
        {/* Chat History Section */}
        <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto bg-background-main px-6 py-4 pb-20 text-left">
          {showSpinner ? (
            <div className="text-center text-gray-400 py-4">Loading chat...</div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No messages yet.</div>
          ) : (
            chatMessages.map(msg => {
              const isCurrentUser = msg.sender_id === currentUserId;
              const senderName = isCurrentUser ? currentUserName : otherUserName;
              const senderPic = isCurrentUser ? currentUserProfilePic : otherUserProfilePic;
              return (
                <div key={msg.id} className={`my-6 flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-center`} >
                  {/* Left avatar for other user, right avatar for current user */}
                  {!isCurrentUser && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light mr-4 flex-shrink-0 flex items-center justify-center">
                      {senderPic ? (
                        <img src={senderPic} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-lg font-bold text-text-light">{senderName?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[70%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className={`font-semibold text-primary-blue text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {!isCurrentUser ? senderName : ''}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl ${isCurrentUser ? '' : ''} ${msg.optimistic ? 'opacity-60' : ''}`}
                      style={isCurrentUser ? {
                        background: 'linear-gradient(45deg, #0066FF 0%, #00C9A7 100%)',
                        color: 'white',
                        fontWeight: 500
                      } : {
                        background: 'linear-gradient(135deg, #4D9CFF, #4DDDCC)',
                        color: 'white',
                        fontWeight: 500
                      }}
                    >
                      {msg.content}
                    </div>
                    <div className={`text-xs text-gray-400 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {isCurrentUser && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light ml-4 flex-shrink-0 flex items-center justify-center">
                      {senderPic ? (
                        <img src={senderPic} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-lg font-bold text-text-light">{senderName?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {/* Input Section */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-border-light p-6 flex items-center gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base"
            placeholder={`Send a message to ${otherUserName}`}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending || (isSingleToSingle && !canChat)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          {messageText.trim() && (
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-blue-light to-accent-teal-light shadow-md hover:scale-105 transition-transform"
              onClick={handleSendMessage}
              disabled={sending || (isSingleToSingle && !canChat)}
              style={{ border: '2px solid', borderImage: 'linear-gradient(45deg, #0066FF, #00C9A7) 1' }}
            >
              {/* SVG Arrow Icon, up and right, rotated 45deg */}
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
                <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="white"/>
              </svg>
            </button>
          )}
        </div>
        {/* Responsive Close/Back Button */}
        {/* Top left back arrow for mobile */}
        <button
          className="absolute top-4 left-4 block sm:hidden bg-white/80 rounded-full p-2 shadow focus:outline-none"
          onClick={onClose}
          aria-label="Back"
          disabled={sending}
        >
          {/* Heroicons chevron-left */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {/* Top right X for desktop */}
        <button
          className="absolute top-4 right-4 hidden sm:block bg-white/80 rounded-full p-2 shadow focus:outline-none"
          onClick={onClose}
          aria-label="Close"
          disabled={sending}
        >
          {/* Heroicons X-mark */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal; 