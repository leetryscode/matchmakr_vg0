"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ChatModal from '../chat/ChatModal';

interface MatchMakrChatListClientProps {
  userId: string;
  conversations: any[];
  otherProfiles: Record<string, any>;
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

const MatchMakrChatListClient: React.FC<MatchMakrChatListClientProps> = ({ userId, conversations, otherProfiles }) => {
  const [openChat, setOpenChat] = useState<null | { id: string; name: string; profile_pic_url: string }>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevMsgCount = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

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
      const res = await fetch(`/api/messages/history?userId=${userId}&otherId=${openChat.id}`);
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
  }, [openChat, userId]);

  // After sending a message, refetch chat (but don't clear chatMessages)
  useEffect(() => {
    let isMounted = true;
    if (!sending && messageText === '' && openChat && userId) {
      (async () => {
        const res = await fetch(`/api/messages/history?userId=${userId}&otherId=${openChat.id}`);
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
  }, [sending, messageText, openChat, userId]);

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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: userId,
          recipient_id: openChat.id,
          content: optimisticMsg.content,
        }),
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

  return (
    <div className="bg-background-card p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-primary-blue/10 mb-8">
      <h2 className="font-inter font-bold text-3xl text-gray-800 mb-3">MatchMakr Chat</h2>
      <p className="text-gray-600 text-lg leading-relaxed mb-6">Chat windows with other MatchMakrs like you, on behalf of their sponsored singles =)</p>
      {conversations.length === 0 ? (
        <div className="text-center p-12 bg-gradient-card rounded-2xl border-2 border-dashed border-gray-300 mb-6">
          <p className="text-gray-500 text-lg">You have no more chats with MatchMakrs.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 mb-6">
          {conversations.map((msg: any) => {
            const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
            const profile = otherProfiles[otherId];
            return (
              <button
                key={msg.id}
                className="flex items-center gap-4 py-4 w-full text-left hover:bg-gray-50 rounded-lg transition"
                onClick={() => setOpenChat(profile)}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-accent-teal-light bg-gray-100 flex-shrink-0">
                  {profile?.profile_pic_url ? (
                    <img src={profile.profile_pic_url} alt={profile.name || 'MatchMakr'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                      {profile?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{profile?.name || 'Unknown MatchMakr'}</div>
                  <div className="text-sm text-gray-500 truncate">{msg.content}</div>
                </div>
                <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </button>
            );
          })}
        </div>
      )}
      <button className="w-full bg-gradient-primary text-white py-4 px-8 rounded-full font-semibold text-lg shadow-deep hover:shadow-deep-hover transition-all duration-300 hover:-translate-y-2">
        Invite a MatchMakr!
      </button>
      {/* Chat Modal */}
      {openChat && typeof window !== 'undefined' && document.body && (
        <ChatModal
          open={!!openChat}
          onClose={() => setOpenChat(null)}
          currentUserId={userId}
          otherUserId={openChat.id}
          otherUserName={openChat.name || ''}
          otherUserProfilePic={openChat.profile_pic_url}
          aboutSingleA={{ id: '', name: '', photo: null }} // TODO: Pass the current user's sponsored single if available
          aboutSingleB={{ id: '', name: '', photo: null }} // TODO: Pass the other matchmakr's sponsored single if available
        />
      )}
    </div>
  );
};

export default MatchMakrChatListClient; 