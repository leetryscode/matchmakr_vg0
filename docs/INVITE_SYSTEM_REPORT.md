# Orbit Invite System – Current Architecture Report

**Generated:** 2025-02-18  
**Purpose:** Stabilization audit before adding new flows. No feature proposals.

---

## 1. Flow Summaries

### 1.1 Sponsor → Single (JOIN)

| Field | Value |
|-------|-------|
| **UI entry point** | `InviteSingleModal` – used in `ManagedSinglesGrid`, `pond/page.tsx`, `ProfileClient` |
| **API route** | `POST /api/invite-single` |
| **Edge function** | `sponsor-single` |
| **Invite status** | **PENDING** (invitee has no account) or **CLAIMED** (invitee exists as SINGLE) |
| **Token** | Yes – 12-char alphanumeric, stored in `invites.token` |
| **Resend email** | Yes – both paths. Template: `RESEND_TEMPLATE_SPONSOR_TO_SINGLE` |
| **InviteGate** | Yes – for PENDING only. CLAIMED invites return 410 from `/api/invite/[token]` |
| **Onboarding prefill** | Yes – `lockedRole: 'SINGLE'`, prefill name/email/community |
| **invitee_label** | Stored in `invites.invitee_label`; used in email as `INVITEE_NAME` |
| **Dedupe** | Yes – blocks if PENDING/CLAIMED invite exists for `(inviter_id, invitee_email)` – **no `target_user_type` filter** |

**Paths:**
- **Invitee does not exist:** Create PENDING invite → send email → link goes to InviteGate → onboarding.
- **Invitee exists as SINGLE:** Create CLAIMED invite + `sponsorship_request` (PENDING_SINGLE_APPROVAL) → send email → link goes to `/invite/:token` → **API returns 410** (invite is CLAIMED).

---

### 1.2 Sponsor → Sponsor (JOIN)

| Field | Value |
|-------|-------|
| **UI entry point** | Inline modal in `MatchMakrChatListClient`; `InviteOtherMatchMakrs` component |
| **API route** | `POST /api/invite-sponsor-to-join` |
| **Edge function** | `sponsor-sponsor` |
| **Invite status** | **PENDING** only (invitee must sign up) |
| **Token** | Yes – same 12-char format, stored in `invites.token` |
| **Resend email** | Yes – template: `RESEND_TEMPLATE_SPONSOR_TO_SPONSOR` |
| **InviteGate** | Yes – PENDING only |
| **Onboarding prefill** | Yes – `lockedRole: 'SPONSOR'`, prefill name/email/community |
| **invitee_label** | Stored in `invites.invitee_label`; used in email as `INVITEE_NAME` |
| **Dedupe** | Yes – blocks if PENDING invite exists for `(inviter_id, invitee_email, target_user_type: 'MATCHMAKR')` |

---

### 1.3 Single → Sponsor (CONNECT)

| Field | Value |
|-------|-------|
| **UI entry point** | `InviteMatchMakrModal` – used in `SingleDashboardClient` |
| **API route** | `POST /api/invite-sponsor` |
| **Edge function** | `sponsor-user` |
| **Invite status** | **CLAIMED** only (sponsor must already exist) |
| **Token** | Yes – generated and stored, but **not used** (no email link) |
| **Resend email** | No |
| **InviteGate** | No – invite is CLAIMED; `/api/invite/[token]` would return 410 |
| **Onboarding prefill** | N/A – sponsor already has account |
| **invitee_label** | Stored in `invites.invitee_label`; not used in email (no email) |
| **Dedupe** | Via `sponsorship_requests` upsert – `onConflict: 'sponsor_id,single_id'`, `ignoreDuplicates: true` |

**Flow:** Single invites existing MatchMakr → create CLAIMED invite + `sponsorship_request` (PENDING_SPONSOR_APPROVAL) → notification to sponsor (no email).

---

### 1.4 Single → Single

**Not implemented.** No API route, edge function, or UI. Ignored for now.

---

## 2. Shared Components & Logic

### InviteGate

- **Route:** `/invite/[token]`
- **API:** `GET /api/invite/[token]` – returns 410 if `invite.status !== 'PENDING'`
- **Component:** `InviteGate` – role-specific copy (SINGLE vs SPONSOR), Continue → `setInviteMode` → `/onboarding`
- **Role mapping:** `target_user_type === 'MATCHMAKR'` → `invited_role: 'SPONSOR'`; else `'SINGLE'`

### Invite mode (onboarding)

- **Storage:** `sessionStorage` key `orbit_invite_mode`
- **Fields:** `inviteToken`, `lockedRole`, `prefillName`, `prefillEmail`, `prefillCommunity`
- **Onboarding:** Skips step 1 (role selection) when `getInviteMode()` is set; locks role; prefills name (step 2), community (CommunityStep), email (AccountCreationStep)

### handle_new_user invite claim

- **File:** `supabase/migrations/20260215160000_handle_new_user_invite_claim.sql`
- **Scope:** Only when `user_type = 'SINGLE'`
- **Logic:** Finds one PENDING invite with `invitee_user_id IS NULL` and matching `invitee_email` (ORDER BY created_at DESC). Updates to CLAIMED, sets `invitee_user_id`, `claimed_at`. Creates `sponsorship_request` (PENDING_SINGLE_APPROVAL) and notification.
- **Does NOT filter by `target_user_type`** – can claim a MATCHMAKR invite if one exists for that email.

---

## 3. Inconsistencies Across JOIN Flows

| Inconsistency | Sponsor → Single | Sponsor → Sponsor |
|---------------|------------------|------------------|
| **Dedupe scope** | No `target_user_type` filter – blocks on any PENDING/CLAIMED for (inviter, email) | Filters by `target_user_type: 'MATCHMAKR'` |
| **Effect** | Sponsor→Sponsor invite blocks Sponsor→Single to same email | Sponsor→Single invite does NOT block Sponsor→Sponsor – can create two PENDING invites for same email |
| **Status paths** | PENDING and CLAIMED (existing user) | PENDING only |
| **CLAIMED + email link** | Sends email with `/invite/:token` for CLAIMED; API returns 410 when clicked | N/A |

---

## 4. JOIN Flow Alignment (Except target_user_type)

**Aligned:**
- Token generation (12-char alphanumeric)
- Resend template pattern (INVITOR_NAME, INVITEE_NAME, INVITE_LINK)
- InviteGate for PENDING
- Onboarding prefill (locked role, name, email, community)
- `invitee_label` stored and used in email

**Not aligned:**
- Sponsor→Single has a CLAIMED path (existing user) with email; Sponsor→Sponsor does not
- Dedupe logic differs (see above)

---

## 5. CONNECT Flow – Intentionally Different

Single→Sponsor is designed to differ:

- **Invitee has account** – no signup, no InviteGate
- **No Resend email** – uses in-app notification
- **Status CLAIMED** – invite created with `invitee_user_id` set
- **Token generated but unused** – no invite link in email
- **Different API/edge function** – `/api/invite-sponsor` → `sponsor-user`

---

## 6. Technical Debt & Risks

### 6.1 Pre-deployment risks

1. **Sponsor→Single CLAIMED path – broken invite link**  
   For existing singles, sponsor-single sends an email with `/invite/:token`. The invite is CLAIMED, so `GET /api/invite/[token]` returns 410. The single sees “Invite no longer valid” when clicking. Consider a different template or flow for existing users (e.g. “Log in to accept” instead of invite link).

2. **handle_new_user does not filter by target_user_type**  
   When a SINGLE signs up, the trigger claims the most recent PENDING invite for that email, regardless of `target_user_type`. If both Sponsor→Single and Sponsor→Sponsor invites exist, it may claim the wrong one. Add `AND target_user_type = 'SINGLE'` to the invite lookup.

3. **Sponsor→Sponsor invite never claimed**  
   When a Sponsor invitee signs up as MATCHMAKR, `handle_new_user` does not run for MATCHMAKR. The invite stays PENDING. No functional breakage, but invite rows remain PENDING after signup. Dashboard may show “Invited” for users who already joined.

4. **Dedupe asymmetry**  
   Sponsor→Single blocks on any PENDING/CLAIMED for (inviter, email). Sponsor→Sponsor blocks only on MATCHMAKR invites. Result: Sponsor→Sponsor can create a second PENDING invite when a Sponsor→Single PENDING already exists for the same email.

### 6.2 Configuration risks

5. **Env vars**  
   All flows depend on: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (invite API), `RESEND_API_KEY`, `RESEND_FROM`, `SITE_URL`. Sponsor→Single: `RESEND_TEMPLATE_SPONSOR_TO_SINGLE`. Sponsor→Sponsor: `RESEND_TEMPLATE_SPONSOR_TO_SPONSOR`. Missing vars can cause silent email failures.

6. **invite-sponsor-to-join uses session client**  
   Route uses `createClient()` (session). If session is invalid or missing, the request fails before reaching the edge function.

### 6.3 UX risks

7. **“already_pending” returns 200**  
   When dedupe blocks a new invite, the API returns 200 with `status: 'already_pending'`. UI shows “Invite sent to {email}” even though no email was sent. Consider surfacing the API message or treating `already_pending` as a distinct case.

---

## 7. File Reference

| Purpose | File |
|---------|------|
| Invite page | `src/app/invite/[token]/page.tsx` |
| Invite metadata API | `src/app/api/invite/[token]/route.ts` |
| InviteGate | `src/components/invite/InviteGate.tsx` |
| Invite mode | `src/lib/invite-mode.ts` |
| Onboarding | `src/app/onboarding/page.tsx` |
| Sponsor→Single API | `src/app/api/invite-single/route.ts` |
| Sponsor→Sponsor API | `src/app/api/invite-sponsor-to-join/route.ts` |
| Single→Sponsor API | `src/app/api/invite-sponsor/route.ts` |
| sponsor-single | `supabase/functions/sponsor-single/index.ts` |
| sponsor-sponsor | `supabase/functions/sponsor-sponsor/index.ts` |
| sponsor-user | `supabase/functions/sponsor-user/index.ts` |
| handle_new_user | `supabase/migrations/20260215160000_handle_new_user_invite_claim.sql` |
