'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;
    
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new;
        // If the new message belongs to this conversation, add it to chatMessages
        if (newMessage.conversation_id === conversationId) {
          setChatMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

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
  }, [supabase]);

  // Mark messages as read as soon as chat is opened
  useEffect(() => {
    if (!chatContext || !currentUserId) return;
    const otherId = getOtherMatchmakrId();
    if (!otherId) return;
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, otherId }),
    });
  }, [chatContext, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  // Helper to get the other MatchMakr's ID
  function getOtherMatchmakrId() {
    if (!chatContext || !currentUserId) return '';
    if (chatContext.initiatorProfile?.id === currentUserId) {
      return chatContext.recipientProfile?.id;
    } else {
      return chatContext.initiatorProfile?.id;
    }
  }

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatContext?.conversation_id || !currentUserId) return;
    const recipientId = getOtherMatchmakrId();
    setSending(true);
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
          conversation_id: chatContext.conversation_id,
          about_single_id: chatContext.currentUserSingle?.id,
          clicked_single_id: chatContext.otherUserSingle?.id,
        }),
      });
    } finally {
      setSending(false);
    }
  };

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
        {/* Chat header with singles' photos and names */}
        {chatContext && (
          <div className="flex items-center justify-center gap-8 px-4 py-4 border-b border-gray-100 bg-white/70">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                {chatContext.otherUserSingle?.photo ? (
                  <img src={chatContext.otherUserSingle.photo} alt={chatContext.otherUserSingle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{chatContext.otherUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">{chatContext.otherUserSingle?.name || 'Unknown'}</div>
            </div>
            <div className="text-lg font-medium text-text-light">and</div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                {chatContext.currentUserSingle?.photo ? (
                  <img src={chatContext.currentUserSingle.photo} alt={chatContext.currentUserSingle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{chatContext.currentUserSingle?.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">{chatContext.currentUserSingle?.name || 'Unknown'}</div>
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
            chatMessages.map(msg => {
              const isCurrentUser = msg.sender_id === currentUserId;
              // Determine sender profile
              let senderProfile = null;
              if (msg.sender_id === chatContext.initiatorProfile?.id) {
                senderProfile = chatContext.initiatorProfile;
              } else if (msg.sender_id === chatContext.recipientProfile?.id) {
                senderProfile = chatContext.recipientProfile;
              }
              const senderName = senderProfile?.name || 'Unknown';
              const senderPic = senderProfile?.photo || null;
              return (
                <div key={msg.id} className={`my-8 flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-center`} >
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
                    <div className={`font-semibold text-primary-blue text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>{senderName}</div>
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
        <div className="px-4 py-5 border-t border-border-light flex items-center gap-3 bg-white/80 rounded-none">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base bg-white/90"
            placeholder={`Send a message...`}
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