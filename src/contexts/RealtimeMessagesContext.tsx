'use client';

/**
 * RealtimeMessagesContext
 *
 * A single global Supabase Realtime subscription for all message and conversation
 * updates in Orbit. Replaces the per-component subscription pattern documented in
 * REALTIME_AUDIT.md.
 *
 * FILTER STRATEGY: Subscribes to the messages table with no server-side filter,
 * relying on Supabase Row-Level Security (RLS) to ensure the user receives only
 * messages they are a party to. Client-side routing then dispatches each INSERT
 * to the correct registered callback. This approach is chosen over
 * `conversation_id=in.(...)` because:
 *   1. Supabase channel filters cannot be dynamically updated after subscription.
 *   2. Direct single/sponsor messages have no conversation_id, so a conversation_id
 *      filter would miss them entirely.
 *   3. The current per-component code already uses no server-side filter; this
 *      consolidates those N subscriptions into one.
 *
 * RECONNECT: Exponential backoff (1s → 2s → 4s … max 30s) on CLOSED/CHANNEL_ERROR.
 *
 * FALLBACK: Consumers call notifySent(key) after sending. If realtime does not
 * deliver the corresponding INSERT within 3 seconds, the consumer's onRefreshNeeded
 * callback is invoked so it can re-fetch history from the API.
 *
 * VISIBILITY: On tab restore (visibilitychange → visible), refreshConversations()
 * is called to catch any unread counts missed while backgrounded.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  unreadCount: number;
  about_single_id?: string | null;
  clicked_single_id?: string | null;
  conversation: {
    id: string;
    about_single: { id: string; name: string; photo: string | null } | null;
    clicked_single: { id: string; name: string; photo: string | null } | null;
    initiator: any;
    recipient: any;
    status?: string;
    match_status?: string;
  };
}

type MessageCallback = (message: any) => void;
type RefreshCallback = () => void | Promise<void>;

interface CallbackEntry {
  onMessage: MessageCallback;
  onRefreshNeeded?: RefreshCallback;
}

export interface RealtimeMessagesContextValue {
  /**
   * Register a chat surface to receive messages for a specific key.
   * For conversation_id-based chats, key = conversationId (UUID).
   * For direct (sender/recipient) chats, key = getDirectKey(userId1, userId2).
   */
  registerConversation: (
    key: string,
    onMessage: MessageCallback,
    onRefreshNeeded?: RefreshCallback
  ) => void;

  /** Remove the registration and cancel any pending fallback timer for this key. */
  unregisterConversation: (key: string) => void;

  /**
   * Signal that a message was just sent for this key.
   * Starts a 3-second fallback timer; if realtime delivers the INSERT within
   * that window the timer is cancelled, otherwise onRefreshNeeded is invoked.
   */
  notifySent: (key: string) => void;

  /**
   * The conversation the user is currently viewing. Messages arriving for this
   * conversation will NOT increment unreadCounts.
   */
  setActiveConversationId: (id: string | null) => void;

  /**
   * Explicitly zero the unread count for a conversation (e.g. on open).
   */
  clearUnreadCount: (conversationId: string) => void;

  /**
   * Utility — returns a stable, deterministic key for a direct (no conversation_id)
   * chat between two users. Pass to registerConversation / unregisterConversation.
   */
  getDirectKey: (userId1: string, userId2: string) => string;

  /** Live conversation list sorted by last_message_time, updated by realtime events. */
  conversations: ConversationSummary[];

  /**
   * Live unread counts keyed by conversation_id.
   * Incremented on incoming message, zeroed via clearUnreadCount / setActiveConversationId.
   */
  unreadCounts: Record<string, number>;

  /** Force a full re-fetch of conversations from the API (e.g. after tab restore). */
  refreshConversations: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const RealtimeMessagesContext = createContext<
  RealtimeMessagesContextValue | undefined
>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

interface RealtimeMessagesProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

export function RealtimeMessagesProvider({
  userId,
  children,
}: RealtimeMessagesProviderProps) {
  const supabase = getSupabaseClient();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Refs that are safe to read inside Supabase callbacks without stale closures
  const callbacksRef = useRef<Map<string, CallbackEntry>>(new Map());
  const fallbackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const activeConvIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(1000);

  // Keep activeConvIdRef in sync with state so the subscription callback can
  // read it without a stale closure
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // ── Stable helpers ────────────────────────────────────────────────────────

  const getDirectKey = useCallback(
    (userId1: string, userId2: string): string =>
      `direct:${[userId1, userId2].sort().join(':')}`,
    []
  );

  // ── Conversation list fetch ───────────────────────────────────────────────

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        const counts: Record<string, number> = {};
        for (const conv of data.conversations) {
          // conversation id lives in conv.id (same as conv.conversation.id)
          counts[conv.id] = conv.unreadCount || 0;
        }
        setUnreadCounts(counts);
      }
    } catch {
      // Silent — network errors should not crash the provider
    }
  }, [userId]);

  // Keep a ref so the message handler can call it without being a dep
  const refreshConversationsRef = useRef(refreshConversations);
  refreshConversationsRef.current = refreshConversations;

  // Initial load when userId becomes available
  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setUnreadCounts({});
      return;
    }
    refreshConversations();
  }, [userId, refreshConversations]);

  // ── Incoming message handler (via ref to avoid stale closures) ────────────

  /**
   * This ref is updated every render. The Supabase subscription always calls
   * handleMessageRef.current, so it always sees the latest implementation
   * without needing to be listed as an effect dependency.
   */
  const handleMessageRef = useRef<(payload: any) => void>(() => {});

  handleMessageRef.current = (payload: any) => {
    const msg = payload.new;
    if (!msg) return;

    console.log('[RT-DIAG] Raw message received:', msg.id, 'conversation_id:', msg.conversation_id, 'sender:', msg.sender_id);

    const convId: string | null = msg.conversation_id ?? null;
    const routingKey = convId
      ? convId
      : `direct:${[msg.sender_id, msg.recipient_id].sort().join(':')}`;

    // Clear fallback timer — realtime delivered, so no re-fetch needed
    const pending = fallbackTimersRef.current.get(routingKey);
    if (pending) {
      clearTimeout(pending);
      fallbackTimersRef.current.delete(routingKey);
    }

    // Dispatch to registered consumer callback
    const entry = callbacksRef.current.get(routingKey);
    console.log('[RT-DIAG] Routing key:', routingKey, 'Listener found:', !!entry);
    if (entry) {
      entry.onMessage(msg);
    }

    // Update conversation list (only for conversation_id-based messages)
    if (convId) {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx === -1) {
          // Conversation not yet in list — fetch updated list
          refreshConversationsRef.current();
          return prev;
        }
        const copy = [...prev];
        const updated: ConversationSummary = {
          ...copy[idx],
          content: msg.content ?? copy[idx].content,
          created_at: msg.created_at ?? copy[idx].created_at,
        };
        copy.splice(idx, 1);
        return [updated, ...copy]; // Move to top
      });

      // Increment unread only when this isn't the conversation the user is viewing
      if (convId !== activeConvIdRef.current) {
        setUnreadCounts((prev) => ({
          ...prev,
          [convId]: (prev[convId] || 0) + 1,
        }));
      }
    }
  };

  // ── Supabase channel setup with exponential-backoff reconnect ─────────────

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const doSetup = () => {
      if (!active) return;

      // Remove any stale channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`orbit-messages-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => handleMessageRef.current(payload)
        )
        .subscribe((status: string) => {
          console.log('[RT-DIAG] Channel subscribe status:', status);
          if (status === 'SUBSCRIBED') {
            backoffRef.current = 1000;
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
              retryTimerRef.current = null;
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              backoffRef.current = Math.min(backoffRef.current * 2, 30000);
              doSetup();
            }, backoffRef.current);
          }
        });

      channelRef.current = channel;
    };

    doSetup();

    return () => {
      active = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // supabase is singleton — stable reference, safe to omit from deps
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility restore — catch any missed unread counts ───────────────────

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        refreshConversationsRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  // ── Public API ────────────────────────────────────────────────────────────

  const registerConversation = useCallback(
    (
      key: string,
      onMessage: MessageCallback,
      onRefreshNeeded?: RefreshCallback
    ) => {
      console.log('[RT-DIAG] Registered listener for key:', key);
      callbacksRef.current.set(key, { onMessage, onRefreshNeeded });
    },
    []
  );

  const unregisterConversation = useCallback((key: string) => {
    callbacksRef.current.delete(key);
    const timer = fallbackTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      fallbackTimersRef.current.delete(key);
    }
  }, []);

  const notifySent = useCallback((key: string) => {
    // Cancel any existing fallback timer for this key first
    const existing = fallbackTimersRef.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      fallbackTimersRef.current.delete(key);
      const entry = callbacksRef.current.get(key);
      if (entry?.onRefreshNeeded) {
        entry.onRefreshNeeded();
      }
    }, 3000);

    fallbackTimersRef.current.set(key, timer);
  }, []);

  const clearUnreadCount = useCallback((conversationId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

  const value: RealtimeMessagesContextValue = {
    registerConversation,
    unregisterConversation,
    notifySent,
    setActiveConversationId,
    clearUnreadCount,
    getDirectKey,
    conversations,
    unreadCounts,
    refreshConversations,
  };

  return (
    <RealtimeMessagesContext.Provider value={value}>
      {children}
    </RealtimeMessagesContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRealtimeMessages(): RealtimeMessagesContextValue {
  const ctx = useContext(RealtimeMessagesContext);
  if (!ctx) {
    throw new Error(
      'useRealtimeMessages must be used within a RealtimeMessagesProvider'
    );
  }
  return ctx;
}
