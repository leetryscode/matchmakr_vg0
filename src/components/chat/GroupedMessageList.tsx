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
  showSenderNames?: boolean; // default false
};

export default function GroupedMessageList({
  messages,
  currentUserId,
  getAvatarUrl,
  getDisplayName,
  showSenderNames = false,
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
        const spacingClass = prevSameSender ? 'mt-1' : 'mt-4';

        return (
          <div key={msg.id} className={`${spacingClass} flex ${isMine ? 'justify-end' : 'justify-start'} items-center`}>
            {/* Left avatar for incoming messages (only on last message in group) */}
            {!isMine && isLastInGroup && (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light mr-4 flex-shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-lg font-bold text-text-light">{initials}</span>
                  </div>
                )}
              </div>
            )}
            {/* Spacer for incoming messages when avatar is not shown */}
            {!isMine && !isLastInGroup && <div className="w-14 mr-4 flex-shrink-0" />}

            {/* Message content */}
            <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {/* Sender name (only at group start, incoming only, when enabled) */}
              {showSenderNames && !isMine && isFirstInGroup && displayName && (
                <div className={`font-semibold text-primary-blue text-xs mb-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {displayName}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`px-5 py-3 rounded-2xl ${msg.optimistic ? 'opacity-60' : ''}`}
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
                <div className={`text-[11px] text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Right avatar for outgoing messages (only on last message in group) */}
            {isMine && isLastInGroup && (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent-teal-light ml-4 flex-shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-background-main flex items-center justify-center">
                    <span className="text-lg font-bold text-text-light">{initials}</span>
                  </div>
                )}
              </div>
            )}
            {/* Spacer for outgoing messages when avatar is not shown */}
            {isMine && !isLastInGroup && <div className="w-14 ml-4 flex-shrink-0" />}
          </div>
        );
      })}
    </>
  );
}

