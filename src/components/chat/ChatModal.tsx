"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfilePic?: string | null;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, currentUserId, otherUserId, otherUserName, otherUserProfilePic }) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCount = useRef<number>(0);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat history
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const fetchChatHistory = async () => {
      setChatLoading(true);
      setShowSpinner(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      loadingTimeout.current = setTimeout(() => {
        if (isMounted) setShowSpinner(true);
      }, 200);
      const res = await fetch(`/api/messages/history?userId=${currentUserId}&otherId=${otherUserId}`);
      const data = await res.json();
      if (isMounted) {
        setChatMessages(data.success && data.messages ? data.messages : []);
        setChatLoading(false);
        setShowSpinner(false);
      }
    };
    fetchChatHistory();
    return () => {
      isMounted = false;
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    };
  }, [open, currentUserId, otherUserId]);

  // Smart auto-scroll: only scroll if modal is opened or user is near the bottom
  useEffect(() => {
    if (!open) return;
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
  }, [chatMessages.length, open]);

  // Always scroll to bottom when modal is opened
  useEffect(() => {
    if (!open) return;
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [open]);

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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          recipient_id: otherUserId,
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

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full text-center min-h-[32rem] min-w-[22rem]">
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-accent-teal-light mb-2">
            {otherUserProfilePic ? (
              <img src={otherUserProfilePic} alt={otherUserName || 'MatchMakr'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-background-main flex items-center justify-center">
                <span className="text-2xl font-bold text-text-light">
                  {otherUserName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <h3 className="text-lg font-medium text-primary-blue-light">Chat with {otherUserName}</h3>
        </div>
        {/* Chat history */}
        <div ref={chatContainerRef} className="mb-4 h-64 overflow-y-auto bg-background-main rounded p-2 border border-border-light text-left">
          {showSpinner ? (
            <div className="text-center text-gray-400 py-4">Loading chat...</div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No messages yet.</div>
          ) : (
            chatMessages.map(msg => (
              <div key={msg.id} className={`my-2 flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`} >
                <div className={`px-3 py-2 rounded-lg ${msg.sender_id === currentUserId ? 'bg-primary-blue-light text-white' : 'bg-gray-200 text-gray-800'} ${msg.optimistic ? 'opacity-60' : ''}`} style={{maxWidth:'75%'}}>
                  {msg.content}
                  <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mb-6">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50"
            placeholder="Type your message..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          <button
            className="w-full px-6 py-2 bg-primary-blue-light text-white rounded-md font-medium hover:bg-primary-blue disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSendMessage}
            disabled={sending || !messageText.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <button
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
          onClick={onClose}
          disabled={sending}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal; 