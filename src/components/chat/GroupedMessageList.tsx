'use client';

export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  optimistic?: boolean;
  // Allow any other fields that might be present
  [key: string]: any;
};

export type GroupedMessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  getAvatarUrl?: (userId: string) => string | null;
  getDisplayName?: (userId: string) => string | null;
};

export default function GroupedMessageList({
  messages,
  currentUserId,
  getAvatarUrl,
  getDisplayName,
}: GroupedMessageListProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <>
      {messages.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId;
        const prevSameSender = i > 0 && messages[i - 1].sender_id === msg.sender_id;
        const nextSameSender = i < messages.length - 1 && messages[i + 1].sender_id === msg.sender_id;
        const isFirstInGroup = !prevSameSender;
        const isLastInGroup = !nextSameSender;

        const avatarUrl = getAvatarUrl ? getAvatarUrl(msg.sender_id) : null;
        const displayName = getDisplayName ? getDisplayName(msg.sender_id) : null;
        const initials = displayName?.charAt(0).toUpperCase() || '?';

        // Spacing: tight within group, larger between groups
        const spacingClass = prevSameSender ? 'mt-0.5' : 'mt-3';

        return (
          <div key={msg.id} className={`${spacingClass} flex ${isMine ? 'justify-end' : 'justify-start'} items-end`}>
            {/* Left avatar for incoming messages (only on last message in group) */}
            {!isMine && isLastInGroup && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent-teal-light mr-2.5 flex-shrink-0 flex items-center justify-center self-end">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-xs font-bold text-text-light">{initials}</span>
                  </div>
                )}
              </div>
            )}
            {/* Spacer for incoming messages when avatar is not shown */}
            {!isMine && !isLastInGroup && <div className="w-8 mr-2.5 flex-shrink-0" />}

            {/* Message content */}
            <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {/* Message bubble */}
              <div
                className={`px-4 py-2.5 rounded-xl ${msg.optimistic ? 'opacity-60' : ''}`}
                style={
                  isMine
                    ? {
                        background: 'linear-gradient(45deg, #0066FF 0%, #00C9A7 100%)',
                        color: 'white',
                        fontWeight: 500,
                      }
                    : {
                        background: 'linear-gradient(135deg, #4D9CFF, #4DDDCC)',
                        color: 'white',
                        fontWeight: 500,
                      }
                }
              >
                {msg.content}
              </div>

              {/* Timestamp (only on last message in group) */}
              {isLastInGroup && (
                <div className={`text-[10px] text-gray-400 mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Right avatar for outgoing messages (only on last message in group) */}
            {isMine && isLastInGroup && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent-teal-light ml-2.5 flex-shrink-0 flex items-center justify-center self-end">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-xs font-bold text-text-light">{initials}</span>
                  </div>
                )}
              </div>
            )}
            {/* Spacer for outgoing messages when avatar is not shown */}
            {isMine && !isLastInGroup && <div className="w-8 ml-2.5 flex-shrink-0" />}
          </div>
        );
      })}
    </>
  );
}

