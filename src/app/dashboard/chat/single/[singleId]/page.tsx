'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useConfetti } from '@/components/GlobalConfettiBlast';

export default function SingleChatPage() {
  const router = useRouter();
  const { singleId } = useParams();
  const { triggerConfetti } = useConfetti();
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [singleInfo, setSingleInfo] = useState<any>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [sponsorInfo, setSponsorInfo] = useState<any>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch current user ID, profile info, and user_type
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      if (user?.id) {
        // Fetch current user's profile info and user_type
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
          // If user is SINGLE, fetch sponsor info
          if (userProfile.user_type === 'SINGLE' && userProfile.sponsored_by_id) {
            const { data: sponsorProfile } = await supabase
              .from('profiles')
              .select('id, name, photos')
              .eq('id', userProfile.sponsored_by_id)
              .single();
            if (sponsorProfile) {
              setSponsorInfo({
                id: sponsorProfile.id,
                name: sponsorProfile.name || 'Sponsor',
                photo: sponsorProfile.photos && sponsorProfile.photos.length > 0 ? sponsorProfile.photos[0] : null
              });
            }
          }
        }
      }
    };
    fetchUser();
  }, []);

  // Fetch single info and chat history
  useEffect(() => {
    if (!singleId || !currentUserId) return;
    // Determine the other user's ID for chat history
    let otherId = singleId;
    if (currentUserType === 'SINGLE' && sponsorInfo?.id) {
      otherId = sponsorInfo.id;
    }
    setChatLoading(true);
    const fetchChatData = async () => {
      // Fetch single info
      const supabase = createClient();
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

      // Fetch chat history
      const historyRes = await fetch(`/api/messages/history?userId=${currentUserId}&otherId=${otherId}`);
      const historyData = await historyRes.json();
      setChatMessages(historyData.success && historyData.messages ? historyData.messages : []);
      setChatLoading(false);
      
      // First-time chat tracking for singles - only when chatting with another single (not sponsor)
      if (currentUserType === 'SINGLE' && !sponsorInfo?.id) {
        const conversationKey = `firstChat_${currentUserId}_${singleId}`;
        const hasOpenedBefore = localStorage.getItem(conversationKey);
        if (!hasOpenedBefore) {
          // Trigger confetti for first-time chat open with another single
          triggerConfetti();
          localStorage.setItem(conversationKey, 'true');
        }
      }
    };
    fetchChatData();
  }, [singleId, currentUserId, currentUserType, sponsorInfo]);

  // Mark messages as read as soon as chat is opened
  useEffect(() => {
    if (!singleId || !currentUserId) return;
    let otherId = singleId;
    if (currentUserType === 'SINGLE' && sponsorInfo?.id) {
      otherId = sponsorInfo.id;
    }
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, otherId }),
    });
  }, [singleId, currentUserId, currentUserType, sponsorInfo]);

  // Always scroll to bottom when new messages arrive or chat loads
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }, [chatMessages, chatLoading]);

  // Add typing indicator state
  const [isTyping, setIsTyping] = useState(false);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;
    
    const supabase = createClient();
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new;
        // If the new message is between current user and the other user, add it to chatMessages
        const otherId = currentUserType === 'SINGLE' ? sponsorInfo?.id : singleId;
        if ((newMessage.sender_id === currentUserId && newMessage.recipient_id === otherId) ||
            (newMessage.sender_id === otherId && newMessage.recipient_id === currentUserId)) {
          setChatMessages(prev => {
            // Remove any optimistic message with the same content to avoid duplicates
            const filtered = prev.filter(msg => !(msg.optimistic && msg.content === newMessage.content));
            return [...filtered, newMessage];
          });
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentUserType, sponsorInfo?.id, singleId]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !singleId || !currentUserId) return;
    setSending(true);
    // Determine correct recipient
    let recipientId = singleId;
    if (currentUserType === 'SINGLE' && sponsorInfo?.id) {
      recipientId = sponsorInfo.id;
    }
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: optimisticMsg.content,
        }),
      });
    } finally {
      setSending(false);
    }
  };

  // Helper: get the other user info for chat
  let otherUserInfo = null;
  if (currentUserType === 'SINGLE') {
    otherUserInfo = sponsorInfo;
  } else {
    otherUserInfo = singleInfo;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-main p-0 sm:p-2">
      <div className="flex-1 w-full bg-white/80 rounded-none shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white/80 z-10 rounded-none">
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
          <div></div>
          <div></div>
        </div>
        {/* Chat header with single or sponsor info */}
        {(currentUserType === 'SINGLE' && sponsorInfo) ? (
          <div className="flex items-center justify-center px-4 py-4 border-b border-gray-100 bg-white/70">
            <div className="text-center">
              <div className="text-lg font-medium text-text-light mb-2">
                Chat with your sponsor: <span className="font-bold text-primary-blue">{sponsorInfo.name}</span>
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light mx-auto">
                {sponsorInfo.photo ? (
                  <img src={sponsorInfo.photo} alt={sponsorInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{sponsorInfo.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : singleInfo && (
          <div className="flex items-center justify-center px-4 py-4 border-b border-gray-100 bg-white/70">
            <div className="text-center">
              <div className="text-lg font-medium text-text-light mb-2">
                Chat with your sponsored single: <span className="font-bold text-primary-blue">{singleInfo.name}</span>
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light mx-auto">
                {singleInfo.photo ? (
                  <img src={singleInfo.photo} alt={singleInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{singleInfo.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Chat history */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-2 py-4 text-left" style={{ minHeight: 400 }}>
          {chatLoading ? (
            <div className="text-center text-gray-400 py-4">Loading chat...</div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No messages yet.</div>
          ) : (
            // Show messages in chronological order (oldest to newest)
            chatMessages.map(msg => {
              const isCurrentUser = msg.sender_id === currentUserId;
              const leftProfile = otherUserInfo;
              const rightProfile = currentUserInfo;
              return (
                <div key={msg.id} className={`my-8 flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-center`} >
                  {!isCurrentUser && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light mr-4 flex-shrink-0 flex items-center justify-center">
                      {leftProfile?.photo ? (
                        <img src={leftProfile.photo} alt={leftProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-lg font-bold text-text-light">{leftProfile?.name?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[70%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className={`font-semibold text-primary-blue text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {!isCurrentUser ? leftProfile?.name || '' : ''}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl ${isCurrentUser ? '' : ''} ${msg.optimistic ? 'opacity-60' : ''}`}
                      style={isCurrentUser ? {
                        background: 'linear-gradient(45deg, #a7f3d0 0%, #bae6fd 100%)',
                        color: '#065f46',
                        fontWeight: 500
                      } : {
                        background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)',
                        color: '#7c3aed',
                        fontWeight: 500
                      }}
                    >
                      {msg.content}
                    </div>
                    <div className={`text-xs text-gray-400 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {isCurrentUser && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light ml-4 flex-shrink-0 flex items-center justify-center">
                      {rightProfile?.photo ? (
                        <img src={rightProfile.photo} alt={rightProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background-main flex items-center justify-center">
                          <span className="text-lg font-bold text-text-light">{rightProfile?.name?.charAt(0).toUpperCase() || 'M'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
        </div>
        {/* Input Section */}
        <div className="px-4 py-5 border-t border-border-light flex items-center gap-3 bg-white/80 rounded-none">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base bg-white/90"
            placeholder={`Send a message to ${singleInfo?.name || 'your single'}...`}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          {messageText.trim() && (
            <button
              className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-blue-light to-accent-teal-light shadow-md hover:scale-105 transition-transform"
              onClick={handleSendMessage}
              disabled={sending}
              style={{ border: '2px solid', borderImage: 'linear-gradient(45deg, #3B82F6, #2DD4BF) 1' }}
            >
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-45deg)' }}>
                <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="white"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 