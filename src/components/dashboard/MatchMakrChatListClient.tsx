"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import GlassCard from '@/components/ui/GlassCard';
import Toast from '@/components/ui/Toast';
import { inviteSponsorToJoinByEmail } from '@/lib/invite';
import { useRealtimeMessages } from '@/contexts/RealtimeMessagesContext';

interface MatchMakrChatListClientProps {
  userId: string;
  currentUserName: string;
  currentUserProfilePic: string | null;
}

const MatchMakrChatListClient: React.FC<MatchMakrChatListClientProps> = ({
  userId,
  currentUserName,
  currentUserProfilePic,
}) => {
  const { conversations, unreadCounts, clearUnreadCount, refreshConversations } =
    useRealtimeMessages();

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    conversationId: string;
    profileName: string;
  } | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  // localConversations is used for optimistic deletion; syncs from provider
  const [localConversations, setLocalConversations] = useState(conversations);

  const [inviteSponsorEmail, setInviteSponsorEmail] = useState('');
  const [inviteSponsorLabel, setInviteSponsorLabel] = useState('');
  const [inviteSponsorLoading, setInviteSponsorLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isInviteSponsorModalOpen, setIsInviteSponsorModalOpen] = useState(false);
  const [showSponsorChatFade, setShowSponsorChatFade] = useState(true);
  const sponsorChatScrollRef = useRef<HTMLDivElement>(null);
  const sponsorChatScrollRafRef = useRef<number | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync localConversations whenever the provider's conversation list changes
  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  // Derive otherProfiles map from conversation data
  const otherProfiles = useMemo(() => {
    const map: Record<string, any> = {};
    localConversations.forEach((conv: any) => {
      const otherUserId =
        conv.sender_id === userId ? conv.recipient_id : conv.sender_id;
      const otherUser =
        conv.sender_id === userId
          ? conv.conversation?.recipient
          : conv.conversation?.initiator;
      if (otherUser) {
        map[otherUserId] = {
          id: otherUser.id,
          name: otherUser.name,
          profile_pic_url:
            Array.isArray(otherUser.photos) && otherUser.photos.length > 0
              ? otherUser.photos[0]
              : null,
        };
      }
    });
    return map;
  }, [localConversations, userId]);

  // Close menu on outside click/touch
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuOpen !== null) {
        const menuEl = menuRefs.current[menuOpen];
        if (menuEl && !menuEl.contains(event.target as Node)) {
          setMenuOpen(null);
        }
      }
    }
    if (menuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // Sponsor chat scroll fade
  const handleSponsorChatScroll = useCallback(() => {
    if (sponsorChatScrollRafRef.current != null) return;
    sponsorChatScrollRafRef.current = requestAnimationFrame(() => {
      sponsorChatScrollRafRef.current = null;
      const el = sponsorChatScrollRef.current;
      if (!el) return;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      const newFade = !atBottom;
      setShowSponsorChatFade((prev) => (prev === newFade ? prev : newFade));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (sponsorChatScrollRafRef.current != null)
        cancelAnimationFrame(sponsorChatScrollRafRef.current);
    };
  }, []);

  // Navigate to full-page chat view, zeroing unread count for that conversation
  const handleNavigateToChat = useCallback(
    async (conversationId: string, otherId: string) => {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otherId, conversationId }),
      });
      clearUnreadCount(conversationId);
      router.push(`/dashboard/chat/${conversationId}`);
    },
    [userId, clearUnreadCount, router]
  );

  // Sponsor-to-sponsor chats only (filter out direct single/sponsor rows)
  const sponsorChats = useMemo(() => {
    return localConversations.filter((msg: any) => {
      // All conversations in the list are sponsor-to-sponsor (API already filters)
      return true;
    });
  }, [localConversations]);

  const chatRows = useMemo(() => {
    return sponsorChats.map((msg: any) => {
      const otherId =
        msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      const profile = otherProfiles[otherId];
      const conversation = msg.conversation;
      const singlesInfo =
        conversation?.about_single && conversation?.clicked_single
          ? `${conversation.about_single.name} & ${conversation.clicked_single.name}`
          : 'About singles';
      const unreadCount = unreadCounts[conversation?.id] ?? msg.unreadCount ?? 0;

      return (
        <div
          key={msg.id}
          className="ui-rowcard ui-rowcard-hover group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-orbit-gold/30"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            handleNavigateToChat(msg.conversation.id, otherId);
          }}
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigateToChat(msg.conversation.id, otherId);
            }
          }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orbit-border/50 orbit-surface flex-shrink-0">
            {profile?.profile_pic_url ? (
              <img
                src={profile.profile_pic_url}
                alt={profile.name || 'Sponsor'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-orbit-text">
                {profile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="type-body truncate drop-shadow">
              {profile?.name || 'Unknown sponsor'}
            </div>
            <div className="type-meta truncate mb-1">{singlesInfo}</div>
            <div
              className={`type-meta truncate ${
                unreadCount > 0 ? 'font-semibold tracking-[0.01em]' : ''
              }`}
            >
              {msg.content}
            </div>
          </div>
          <div className="w-[56px] flex items-center justify-end flex-shrink-0 ml-3">
            <span className="type-meta orbit-muted text-right whitespace-nowrap">
              {new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full bg-orbit-gold ring-1 ring-orbit-surface1/50 ml-1.5 flex-shrink-0"
              style={{ opacity: unreadCount > 0 ? 1 : 0 }}
              aria-hidden
            />
          </div>
          <div className="relative menu-btn flex items-center justify-end flex-shrink-0">
            <button
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-orbit-surface/50 focus:outline-none transition-colors text-orbit-text2"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(
                  menuOpen === msg.conversation.id ? null : msg.conversation.id
                );
              }}
              tabIndex={-1}
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ display: 'block' }}
              >
                <circle cx="12" cy="5" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="19" r="2" fill="currentColor" />
              </svg>
            </button>
            {menuOpen === msg.conversation.id && (
              <div
                ref={(el) => {
                  menuRefs.current[msg.conversation.id] = el;
                }}
                className="absolute right-0 mt-2 w-40 orbit-surface-strong border border-orbit-border/50 rounded-lg shadow-lg z-10"
              >
                <button
                  className="block w-full text-left px-4 py-2 text-orbit-warning hover:bg-orbit-surface/50 rounded-t-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({
                      conversationId: msg.conversation.id,
                      profileName: profile?.name || 'this sponsor',
                    });
                    setMenuOpen(null);
                  }}
                >
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [sponsorChats, otherProfiles, userId, unreadCounts, menuOpen, handleNavigateToChat]);

  // Inline invite action
  const InviteAction = () => (
    <button
      onClick={() => setIsInviteSponsorModalOpen(true)}
      className="orbit-btn-secondary type-meta px-3 py-1 text-sm shadow-sm"
    >
      Invite another sponsor
    </button>
  );

  return (
    <div>
      <SectionHeader title="Sponsor chat" right={<InviteAction />} />
      <div className="mt-4">
        {sponsorChats.length === 0 ? (
          <GlassCard variant="1" className="p-4 mb-6">
            <div className="text-center">
              <p className="type-meta">
                Once your single is on Orbit, you'll start meeting other sponsors and your conversations will show up here.
              </p>
            </div>
          </GlassCard>
        ) : (() => {
          const useScrollContainer = sponsorChats.length > 7;
          const listContent = (
            <div
              className={`flex flex-col gap-2.5 ${
                useScrollContainer ? '' : 'mb-6'
              }`}
            >
              {chatRows}
            </div>
          );
          if (useScrollContainer) {
            return (
              <div className="relative mb-6">
                <div
                  ref={sponsorChatScrollRef}
                  className="max-h-[420px] overflow-y-auto no-scrollbar pr-1"
                  onScroll={handleSponsorChatScroll}
                >
                  {listContent}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-b from-transparent to-orbit-canvas transition-opacity duration-200"
                  style={{ opacity: showSponsorChatFade ? 1 : 0 }}
                  aria-hidden
                />
              </div>
            );
          }
          return listContent;
        })()}
      </div>

      {/* Invite Sponsor Modal */}
      {isInviteSponsorModalOpen && (
        <div className="fixed inset-0 bg-orbit-canvas/80 flex justify-center items-center z-50">
          <div className="orbit-surface-strong rounded-xl p-8 w-full max-w-md text-center shadow-card border border-orbit-border/50">
            <h2 className="type-section mb-4">Invite a fellow sponsor</h2>
            <p className="text-orbit-muted mb-6 leading-relaxed">
              Invite a friend to join our community helping friends find love.
            </p>
            <input
              type="text"
              value={inviteSponsorLabel}
              onChange={(e) => setInviteSponsorLabel(e.target.value)}
              placeholder="Name (optional)"
              className="orbit-ring w-full border border-orbit-border/50 rounded-xl px-4 py-3 mb-3 text-orbit-text placeholder:text-orbit-muted bg-orbit-surface/80"
            />
            <input
              type="email"
              value={inviteSponsorEmail}
              onChange={(e) => setInviteSponsorEmail(e.target.value)}
              placeholder="Their email address"
              className="orbit-ring w-full border border-orbit-border/50 rounded-xl px-4 py-3 mb-4 text-orbit-text placeholder:text-orbit-muted bg-orbit-surface/80"
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsInviteSponsorModalOpen(false);
                  setInviteSponsorEmail('');
                  setInviteSponsorLabel('');
                }}
                className="orbit-btn-secondary px-6 py-3 rounded-lg font-semibold"
                disabled={inviteSponsorLoading}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!inviteSponsorEmail.trim()) return;
                  setInviteSponsorLoading(true);
                  try {
                    await inviteSponsorToJoinByEmail(
                      inviteSponsorEmail.trim(),
                      inviteSponsorLabel.trim() || undefined
                    );
                    setToast({
                      message: `Invite sent to ${inviteSponsorEmail.trim()}`,
                      type: 'success',
                    });
                    setIsInviteSponsorModalOpen(false);
                    setInviteSponsorEmail('');
                    setInviteSponsorLabel('');
                  } catch (err) {
                    setToast({
                      message:
                        err instanceof Error
                          ? err.message
                          : 'Failed to send invite.',
                      type: 'error',
                    });
                  } finally {
                    setInviteSponsorLoading(false);
                  }
                }}
                disabled={inviteSponsorLoading || !inviteSponsorEmail.trim()}
                className="orbit-btn-primary rounded-cta px-6 py-3 min-h-[48px] shadow-cta-entry hover:opacity-90 active:opacity-95 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteSponsorLoading ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-orbit-canvas/80 flex items-center justify-center z-[9999]">
          <div className="bg-orbit-surface3 rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
            <h3 className="type-section mb-4 text-orbit-text">Delete chat?</h3>
            <p className="mb-6 text-orbit-text2">
              Delete chat for both parties? This clears the conversation for
              everyone. You can reconnect with this sponsor if you need to
              coordinate again.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                className="orbit-btn-secondary px-6 py-2 rounded-md font-semibold"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-orbit-warning text-orbit-canvas rounded-md font-semibold hover:bg-orbit-warning/90"
                onClick={async () => {
                  const { conversationId } = confirmDelete;
                  setDeletingChatId(conversationId);
                  try {
                    const response = await fetch('/api/messages', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ conversation_id: conversationId }),
                    });
                    if (response.ok) {
                      // Optimistic removal
                      setLocalConversations((prev) =>
                        prev.filter(
                          (msg: any) => msg.conversation?.id !== conversationId
                        )
                      );
                      // Sync from API to ensure consistency
                      refreshConversations();
                    }
                  } catch {
                    // Silent — conversation list will remain as-is
                  } finally {
                    setDeletingChatId(null);
                    setConfirmDelete(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchMakrChatListClient;
