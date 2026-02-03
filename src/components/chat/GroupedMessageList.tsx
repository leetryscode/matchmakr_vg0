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

  // Helper function to determine bubble corner radius based on position in group
  function getBubbleRadiusClass(isMine: boolean, isFirst: boolean, isLast: boolean): string {
    const baseRadius = 'rounded-2xl';
    
    // Single message (both first and last)
    if (isFirst && isLast) {
      return baseRadius;
    }
    
    if (isMine) {
      // Outgoing messages (right-aligned)
      if (isFirst && !isLast) {
        // First in group: flatten bottom-right
        return `${baseRadius} rounded-br-lg`;
      } else if (!isFirst && !isLast) {
        // Middle in group: flatten top-right and bottom-right
        return `${baseRadius} rounded-tr-lg rounded-br-lg`;
      } else if (!isFirst && isLast) {
        // Last in group: flatten top-right only
        return `${baseRadius} rounded-tr-lg`;
      }
    } else {
      // Incoming messages (left-aligned) - mirror the logic
      if (isFirst && !isLast) {
        // First in group: flatten bottom-left
        return `${baseRadius} rounded-bl-lg`;
      } else if (!isFirst && !isLast) {
        // Middle in group: flatten top-left and bottom-left
        return `${baseRadius} rounded-tl-lg rounded-bl-lg`;
      } else if (!isFirst && isLast) {
        // Last in group: flatten top-left only
        return `${baseRadius} rounded-tl-lg`;
      }
    }
    
    return baseRadius; // Fallback
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
        const spacingClass = prevSameSender ? 'mt-[2px]' : 'mt-2.5';

        const formattedTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div key={msg.id} className={`${spacingClass} flex ${isMine ? 'justify-end' : 'justify-start'} items-end`}>
            {/* Left avatar column — always reserved to avoid horizontal shift when avatar appears/disappears */}
            {!isMine && (
              <div className="w-10 h-8 flex-shrink-0 mr-2.5 flex items-center justify-end self-end">
                {isLastInGroup ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent-teal-light flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-xs font-bold text-text-light">{initials}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Message content */}
            <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {/* Message bubble */}
              <div
                className={`px-4 py-2.5 ${getBubbleRadiusClass(isMine, isFirstInGroup, isLastInGroup)} ${msg.optimistic ? 'opacity-60' : ''} ${
                  isMine
                    ? 'bg-background-card text-text-dark font-medium border border-border-light'
                    : 'bg-background-card text-text-dark font-medium border border-border-light'
                }`}
              >
                {msg.content}
              </div>

              {/* Timestamp — always rendered to reserve height; invisible when not last in group */}
              <div
                className={`text-[10px] text-gray-400 mt-0.5 px-4 min-h-[14px] ${isMine ? 'text-right' : 'text-left'} ${!isLastInGroup ? 'opacity-0 select-none' : ''}`}
              >
                {formattedTime}
              </div>
            </div>

            {/* Right avatar column — always reserved to avoid horizontal shift */}
            {isMine && (
              <div className="w-10 h-8 flex-shrink-0 ml-2.5 flex items-center justify-start self-end">
                {isLastInGroup ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent-teal-light flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-main flex items-center justify-center">
                        <span className="text-xs font-bold text-text-light">{initials}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

