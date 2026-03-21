# Orbit Realtime Message Infrastructure Audit

**Date:** 2026-03-20
**Scope:** All Supabase Realtime subscriptions, message lifecycle, and infrastructure conflicts
**Status:** Report only — no code changes made

---

## Executive Summary

The app uses **Supabase Realtime** for message updates, with subscriptions managed across multiple client components and pages. The architecture is:

- **1 singleton Supabase client** (`src/lib/supabase/client.ts`) shared application-wide
- **6 active realtime subscriptions** across different features
- **Hybrid realtime + fallback-refetch pattern** on ConversationPage only
- **NotificationsContext** manages a dedicated notification subscription
- **ChatModalContext** is state coordination only — no realtime logic
- **Conversation list** is fetch-once-on-mount + polling, not realtime

All subscriptions clean up properly. There are no critical bugs, but there are meaningful inefficiencies and gaps documented below.

---

## 1. All Active Supabase `.channel()` / `.on()` Subscriptions

| # | File | Channel Name | Table | Server Filter | Events | Cleanup |
|---|------|-------------|-------|---------------|--------|---------|
| 1 | `src/contexts/NotificationsContext.tsx` | `notifications:${userId}` | `notifications` | `user_id=eq.${userId}` | INSERT, UPDATE | ✅ Yes |
| 2 | `src/components/chat/ChatModal.tsx` | `modal-single-${A}-${B}` or `modal-conv-${convId}` | `messages` | ❌ None (client-side filter) | INSERT | ✅ Yes |
| 3 | `src/app/dashboard/chat/[conversationId]/page.tsx` | `messages-${conversationId}` | `messages` | ❌ None (client-side filter) | INSERT | ✅ Yes |
| 4 | `src/app/dashboard/chat/single/[singleId]/page.tsx` | `single-messages-${A}-${B}` | `messages` | ❌ None (client-side filter) | INSERT | ✅ Yes |
| 5 | `src/components/dashboard/SingleDashboardClient.tsx` | `matches-${userId}` | `matches` | ❌ None (client-side filter) | INSERT, UPDATE | ✅ Yes |
| 6 | `src/components/dashboard/MatchMakrChatListClient.tsx` | `messages-${openConversationId}` | `messages` | ✅ `conversation_id=eq.${openConversationId}` | INSERT | ✅ Yes |

---

## 2. Per-Component Deep Dive

### 2.1 NotificationsContext (`src/contexts/NotificationsContext.tsx`)

**What it subscribes to:**
```
channel('notifications:${userId}')
  .on(INSERT, table: notifications, filter: user_id=eq.${userId})
  .on(UPDATE, table: notifications, filter: user_id=eq.${userId})
```

**Unread count logic:**
- On mount: fetches all notifications where `dismissed_at IS NULL AND (read IS NULL OR read = false)`, sets `activeCount`
- On INSERT/UPDATE: runs a 200ms debounced full re-fetch and recomputes `activeCount`
- `markAllRead()` and `dismissNotification()` perform optimistic state updates and then call `refresh()`

**Guard:** Only subscribes if `userId` is known and `authLoading` is false

**Cleanup:** Removes channel and clears pending debounce timer in useEffect cleanup. Stores channel ref in a local variable, not in React state.

**Issues:**
- Debounce merges rapid events but every notification change triggers a full re-fetch instead of a merge into existing state
- Initial count is fetched once on mount and not re-fetched unless a realtime event fires

---

### 2.2 ChatModalContext (`src/contexts/ChatModalContext.tsx`)

**Realtime logic:** None.
This context tracks `openChatModalIds: Set<string>`. It exposes `registerChatModal(id)`, `unregisterChatModal(id)`, and `isAnyChatModalOpen`. Pure UI coordination.

---

### 2.3 ChatModal (`src/components/chat/ChatModal.tsx`)

**How it gets messages today:**
1. On `open=true`: fetches full chat history from `/api/messages/history` (HTTP, not realtime)
2. After history loads and modal is open: activates a Supabase realtime subscription to `messages` (INSERT only)
3. New messages arrive via subscription → appended to `chatMessages` state
4. Sent messages are added optimistically → replaced in-place when realtime echo arrives

**Does it poll?** No.
**Does it re-fetch on focus?** No.
**Fallback if realtime fails?** No — optimistic message stays pending forever if the realtime echo never arrives.

**Channel guard:** Only subscribes if `open && currentUserId`. Dependency array: `[open, currentUserId, chatContext?.conversation_id, isSingleToSingle, otherUserId]`.

**No server-side filter.** The callback receives ALL `messages` INSERT events and filters client-side by checking sender/recipient or `conversation_id`.

---

### 2.4 ConversationPage (`src/app/dashboard/chat/[conversationId]/page.tsx`)

**Channel:** `messages-${conversationId}` on `messages` table, INSERT only, no server-side filter.

**What happens on INSERT:**
1. Receives `payload.new` (full message record)
2. Checks if `payload.new.conversation_id === subscriptionConversationId`
3. Replaces optimistic message in-place (by matching `tempId`) or appends
4. Triggers React re-render

**UPDATE/DELETE:** Not subscribed. Only INSERT.

**Fallback polling:**
After sending a message, a 2-second `setTimeout` is set. If realtime does NOT deliver the message within 2 seconds (i.e., the optimistic message is still in state), the full history is re-fetched. If realtime does deliver, the timeout is cleared. This is the only subscription in the app with a fallback.

**Cleanup:** Removes channel in useEffect cleanup when `conversationId` or `currentUserId` changes.

**Additional side effect:** Sets `sessionStorage.chatPageVisited = 'true'` on unmount via `beforeunload`. The parent dashboard (`MatchMakrChatList`) reads this flag to trigger a conversation list re-fetch.

---

### 2.5 SingleChatPage (`src/app/dashboard/chat/single/[singleId]/page.tsx`)

**Channel:** `single-messages-${currentUserId}-${singleId}` on `messages` table, INSERT only, no server-side filter.

**What happens on INSERT:**
1. Receives `payload.new`
2. Checks if message is between `currentUserId` and `resolvedOtherId` (bidirectional check)
3. Replaces optimistic or appends

**UPDATE/DELETE:** Not subscribed.

**Fallback polling:** None.

**Race condition guard:** `resolvedOtherId` is computed via `useMemo` after sponsor info is fetched. The subscription only activates once both `currentUserId` and `resolvedOtherId` are known. This prevents subscribing before the sponsor→user relationship is established.

**Cleanup:** Removes channel in useEffect cleanup.

---

### 2.6 Dashboard Conversation List

**Which component renders it:**
`src/components/dashboard/MatchMakrChatList.tsx` (wrapper) + `src/components/dashboard/MatchMakrChatListClient.tsx` (client).

**Where it fetches from:**
The wrapper calls `/api/conversations?userId=${userId}` via HTTP.

**Is there any realtime subscription on the conversation list?** No.
The list is fetched on mount when `userId` is available. Re-fetches are triggered by:
1. The `refresh` URL param being present (cleaned up after use)
2. The `sessionStorage.chatPageVisited` flag set by ConversationPage on unmount

**Does it re-fetch on window focus?** No.

**MatchMakrChatListClient** has a realtime subscription, but only for the **currently open conversation's messages** (not the conversation list itself). New conversations do not appear in real time.

---

### 2.7 Supabase Client (`src/lib/supabase/client.ts`)

**Is it a singleton?** Yes.

```typescript
let supabaseClientInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createBrowserClient(...)
  }
  return supabaseClientInstance
}
```

**Other files creating their own Supabase clients?**
No ad-hoc `createBrowserClient()` or `createClientComponentClient()` calls found outside `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server). All client components call `getSupabaseClient()`. Server routes use the server client factory.

---

## 3. Message Lifecycle: Inbound Message (New INSERT)

```
[User A sends message]
        │
        ▼
POST /api/messages
        │
        ▼
Supabase INSERT into messages table
        │
        ├──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        ▼                                                                  ▼
All subscriptions fire (same Supabase Realtime broadcast):        NotificationsContext
  - ChatModal (if open)                                           (only if a notification
  - ConversationPage (if mounted)                                  row is also inserted)
  - SingleChatPage (if mounted)
  - MatchMakrChatListClient (if conversation is open)
        │
        ▼
Each subscription callback:
  1. Receives payload.new (full record)
  2. Client-side check: does this message belong to this chat?
  3a. If YES (optimistic match): replace optimistic message in-place
  3b. If YES (new from other user): append to chatMessages
  3c. If NO: discard
        │
        ▼
setState(chatMessages) → React re-render → new message visible in UI
```

**ConversationPage additional path:**
```
[Message sent] → 2-second timer starts
        │
        ├─ [Realtime delivers] → timer cleared, no refetch
        └─ [Realtime fails]    → timer fires → GET /api/messages/history → full replace
```

---

## 4. Dead Code / Inefficiencies

### 4.1 Messages subscriptions receive ALL inserts (no server-side filter)

ChatModal, ConversationPage, and SingleChatPage subscribe to the `messages` table with no server-side filter. Every client receives every message INSERT from any conversation in the system and discards it in the callback. Only `MatchMakrChatListClient` uses a `conversation_id` filter.

**Impact:** Wasted bandwidth and callback invocations proportional to system activity.

### 4.2 Unread counts not updated by realtime

When a new message INSERT fires in `MatchMakrChatListClient`, the message is appended to the open chat view, but the **unread count badge for other conversations is not updated**. Counts are only refreshed on modal close or manual mount. The realtime subscription's handler does not touch unread counts.

**State set but effect not propagated:** `unreadCounts` state in `MatchMakrChatListClient` is stale until the next full fetch.

### 4.3 NotificationsContext re-fetches all notifications on every change

The debounced refresh re-fetches the entire notifications array on every INSERT or UPDATE event. It could instead merge `payload.new` directly into state and recompute `activeCount` without a round-trip.

### 4.4 Conversation list not realtime

`MatchMakrChatList` (wrapper) only re-fetches conversations via the `sessionStorage` flag mechanism or URL param. New conversations from other users are invisible until:
- User navigates away from chat and back (triggering the flag)
- User manually refreshes the page

### 4.5 No fallback in ChatModal or SingleChatPage

Only `ConversationPage` has the 2-second fallback refetch. If realtime fails in ChatModal or SingleChatPage, an optimistic message is never confirmed and stays rendered as if it was sent, but the other party never received it (or the sender's view diverges from DB state).

### 4.6 Debug logging in production

Multiple subscriptions log with `[REALTIME-DEBUG]` prefixes (NotificationsContext, SingleDashboardClient, MatchMakrChatListClient). These are unconditional — not gated on `NODE_ENV`. Minor noise in production.

---

## 5. Dependency Map

```
src/lib/supabase/client.ts (singleton)
│
├── src/contexts/NotificationsContext.tsx
│     └── Subscribed to: notifications (INSERT, UPDATE)
│     └── Consumed by: any component calling useNotifications()
│
├── src/contexts/ChatModalContext.tsx
│     └── No realtime logic
│     └── Consumed by: ChatModal, any component calling useChatModal()
│
├── src/components/chat/ChatModal.tsx
│     └── Subscribed to: messages (INSERT, no filter)
│     └── Depends on: ChatModalContext (register/unregister)
│     └── Depends on: AuthContext (currentUserId)
│
├── src/app/dashboard/chat/[conversationId]/page.tsx
│     └── Subscribed to: messages (INSERT, no filter)
│     └── Depends on: AuthContext (currentUserId)
│     └── Side effect: sets sessionStorage.chatPageVisited on unmount
│
├── src/app/dashboard/chat/single/[singleId]/page.tsx
│     └── Subscribed to: messages (INSERT, no filter)
│     └── Depends on: AuthContext (currentUserId, userType)
│
├── src/components/dashboard/SingleDashboardClient.tsx
│     └── Subscribed to: matches (INSERT, UPDATE, no filter)
│     └── Depends on: AuthContext (userId)
│
└── src/components/dashboard/MatchMakrChatListClient.tsx
      └── Subscribed to: messages (INSERT, filter: conversation_id)
      └── Depends on: AuthContext (userId)
      └── Parent: MatchMakrChatList.tsx
            └── Fetches via /api/conversations (HTTP, not realtime)
            └── Reads: sessionStorage.chatPageVisited (set by ConversationPage)
```

---

## 6. Conflicts & Overlaps a Global Provider Must Account For

### 6.1 Multiple simultaneous subscriptions to `messages`

If a user has both `ChatModal` open AND is on a `ConversationPage`, two separate subscriptions both fire for the same INSERT. Each updates its own local `chatMessages` state independently. There is no coordination between them.

**For a global provider:** A single subscription to `messages` would need to route events to all active consumers. This requires a pub/sub or event bus pattern within the provider.

### 6.2 Subscriptions are conditionally active

- `ChatModal` only subscribes when `open === true`
- `MatchMakrChatListClient` only subscribes when `openConversationId` is set
- `SingleChatPage` waits for `resolvedOtherId`

A global provider cannot simply subscribe to everything on mount. It must support dynamic listener registration and deregistration as UI state changes.

### 6.3 Channel naming must remain unique

Multiple components can be open simultaneously. Channel names are scoped by user IDs and conversation IDs to avoid Supabase Realtime treating them as the same subscription. A global provider would need to maintain a registry to avoid channel collisions.

### 6.4 Optimistic message reconciliation is local to each component

Each chat surface maintains its own `chatMessages` state and does in-place replacement of optimistic messages when realtime confirms them. A global provider owning a single shared `chatMessages` map (keyed by conversation) would centralize this but would be a significant architectural change.

### 6.5 The `messages` table is over-subscribed without filters

Three of four `messages` subscriptions have no server-side filter. Consolidating into a global provider should take this opportunity to add `conversation_id` filters (where the conversation ID is known at subscribe time) to reduce broadcast traffic.

### 6.6 NotificationsContext debounce pattern

The 200ms debounce is intentional to coalesce rapid events. A global provider merging notification and message subscriptions must preserve this debounce behavior for notifications without applying it to messages (where low latency matters).

### 6.7 sessionStorage coordination between pages

`ConversationPage` and `MatchMakrChatList` use `sessionStorage.chatPageVisited` as a cross-component signal. A global provider with a realtime conversation list subscription would make this flag unnecessary — but removing it requires the provider to also handle conversation list refresh on new messages.

---

## 7. Summary of Gaps

| Gap | Severity | Affected Surface |
|-----|----------|-----------------|
| Conversation list not realtime | Medium | Sponsor dashboard |
| Unread counts not updated by realtime | Low | MatchMakrChatListClient |
| No fallback for ChatModal if realtime fails | Medium | ChatModal |
| No fallback for SingleChatPage if realtime fails | Medium | SingleChatPage |
| Messages subscriptions lack server-side filters | Low | ChatModal, ConversationPage, SingleChatPage |
| NotificationsContext full re-fetch on every event | Low | All consumers of unread count |
| Debug logging unconditionally in production | Very Low | Multiple files |
| No retry logic if channel.subscribe() fails | Low | All subscriptions |
