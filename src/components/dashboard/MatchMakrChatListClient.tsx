"use client";
import React, { useState, useEffect } from 'react';

interface MatchMakrChatListClientProps {
  userId: string;
  conversations: any[];
  otherProfiles: Record<string, any>;
}

const MatchMakrChatListClient: React.FC<MatchMakrChatListClientProps> = ({ userId, conversations, otherProfiles }) => {
  const [openChat, setOpenChat] = useState<null | { id: string; name: string; profile_pic_url: string }>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoadingHistory, setChatLoadingHistory] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch chat history when modal opens
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!openChat || !userId) return;
      setChatLoadingHistory(true);
      const res = await fetch(`/api/messages/history?userId=${userId}&otherId=${openChat.id}`);
      const data = await res.json();
      if (data.success && data.messages) {
        setChatMessages(data.messages);
      } else {
        setChatMessages([]);
      }
      setChatLoadingHistory(false);
    };
    if (openChat && userId) {
      fetchChatHistory();
    }
  }, [openChat, userId]);

  // After sending a message, refetch chat
  useEffect(() => {
    if (!sending && messageText === '' && openChat && userId) {
      (async () => {
        const res = await fetch(`/api/messages/history?userId=${userId}&otherId=${openChat.id}`);
        const data = await res.json();
        if (data.success && data.messages) {
          setChatMessages(data.messages);
        }
      })();
    }
  }, [sending, messageText, openChat, userId]);

  const handleSendMessage = async () => {
    if (!userId || !openChat?.id || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: userId,
          recipient_id: openChat.id,
          content: messageText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageText('');
      } else {
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
      {openChat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-accent-teal-light mb-2">
                {openChat.profile_pic_url ? (
                  <img src={openChat.profile_pic_url} alt={openChat.name || 'MatchMakr'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-light">
                      {openChat.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-medium text-primary-blue-light">Chat with {openChat.name}</h3>
            </div>
            {/* Chat history */}
            <div className="mb-4 max-h-64 overflow-y-auto bg-background-main rounded p-2 border border-border-light text-left">
              {chatLoadingHistory ? (
                <div className="text-center text-gray-400 py-4">Loading chat...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center text-gray-400 py-4">No messages yet.</div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`my-2 flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`} >
                    <div className={`px-3 py-2 rounded-lg ${msg.sender_id === userId ? 'bg-primary-blue-light text-white' : 'bg-gray-200 text-gray-800'}`} style={{maxWidth:'75%'}}>
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
              onClick={() => setOpenChat(null)}
              disabled={sending}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchMakrChatListClient; 