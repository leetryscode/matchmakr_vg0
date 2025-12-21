'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GroupedMessageList from '@/components/chat/GroupedMessageList';

const BOTTOM_NAV_HEIGHT_PX = 72; // Bottom tab bar height

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

  // Scroll to bottom when chat loads or new messages arrive
  useEffect(() => {
    if (!chatLoading && chatMessages.length > 0) {
      const container = chatContainerRef.current;
      if (container) {
        // Use a longer delay to ensure all content is rendered
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 300);
      }
    }
  }, [chatLoading, chatMessages.length]);

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

  // Helper to get the other user's name for the header
  function getOtherUserName() {
    if (currentUserType === 'SINGLE') {
      return sponsorInfo?.name || 'Sponsor';
    } else {
      return singleInfo?.name || 'Single';
    }
  }

  // Helper: get the other user info for chat
  let otherUserInfo = null;
  if (currentUserType === 'SINGLE') {
    otherUserInfo = sponsorInfo;
  } else {
    otherUserInfo = singleInfo;
  }

  return (
    <div className="min-h-screen flex flex-col p-0 sm:p-2 bg-white">
      <div className="flex-1 w-full bg-white/80 rounded-none shadow-2xl flex flex-col">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
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
        <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-4 pb-[96px] text-left">
          {chatLoading ? (
            <div className="text-center text-gray-400 py-4">Loading chat...</div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No messages yet.</div>
          ) : (
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
              showSenderNames={false}
            />
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
        <div className="sticky bottom-0 z-10 bg-white border-t border-border-light px-4 py-5 pb-[72px] flex items-center gap-3 rounded-none">
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
              style={{ border: '2px solid', borderImage: 'linear-gradient(45deg, #0066FF, #00C9A7) 1' }}
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