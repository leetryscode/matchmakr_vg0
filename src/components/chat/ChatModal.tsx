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
  aboutSingleA: { id: string; name: string; photo?: string | null };
  aboutSingleB: { id: string; name: string; photo?: string | null };
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, currentUserId, otherUserId, otherUserName, otherUserProfilePic, aboutSingleA, aboutSingleB }) => {
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
      <div className="bg-white rounded-2xl p-0 shadow-xl w-[600px] h-[800px] flex flex-col text-center">
        {/* Header/About Section */}
        <div className="p-8 border-b border-border-light">
          <div className="text-xl font-semibold mb-4">Your conversation with <span className="italic text-primary-blue-light">{otherUserName}</span></div>
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                {aboutSingleA.photo ? (
                  <img src={aboutSingleA.photo} alt={aboutSingleA.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{aboutSingleA.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-text-dark">{aboutSingleA.name}</div>
            </div>
            <div className="text-lg font-medium text-text-light">and</div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-teal-light">
                {aboutSingleB.photo ? (
                  <img src={aboutSingleB.photo} alt={aboutSingleB.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">{aboutSingleB.name?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-text-dark">{aboutSingleB.name}</div>
            </div>
          </div>
        </div>
        {/* Chat History Section */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-background-main px-6 py-4 text-left">
          {showSpinner ? (
            <div className="text-center text-gray-400 py-4">Loading chat...</div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No messages yet.</div>
          ) : (
            chatMessages.map(msg => {
              const isCurrentUser = msg.sender_id === currentUserId;
              const senderName = isCurrentUser ? otherUserName : otherUserName; // TODO: Replace with actual sender name logic if needed
              const senderPic = isCurrentUser ? otherUserProfilePic : otherUserProfilePic; // TODO: Replace with actual sender pic logic if needed
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
        <div className="p-6 border-t border-border-light flex items-center gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 text-gray-800 focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50 placeholder:text-gray-400 placeholder:italic text-base"
            placeholder={`Send a message to ${otherUserName}`}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
          />
          {messageText.trim() && (
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-blue-light to-accent-teal-light shadow-md hover:scale-105 transition-transform"
              onClick={handleSendMessage}
              disabled={sending}
              style={{ border: '2px solid', borderImage: 'linear-gradient(45deg, #3B82F6, #2DD4BF) 1' }}
            >
              {/* SVG Arrow Icon, up and right */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 24L24 16L8 8V14L20 16L8 18V24Z" fill="white"/>
              </svg>
            </button>
          )}
        </div>
        <button
          className="absolute top-4 right-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
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