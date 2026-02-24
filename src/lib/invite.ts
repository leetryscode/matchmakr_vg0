/**
 * Canonical invite helpers. Callers handle router.refresh().
 */

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Invite a single by email via the invite-single API route.
 * Requires the caller to be a MatchMakr (sponsor); the edge function enforces this.
 * @param email - Invitee email address
 * @param inviteeLabel - Optional friendly label for display (e.g. "Pam"). Stored for sponsor dashboard cards.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSingleByEmail(
  email: string,
  inviteeLabel?: string | null
): Promise<{ success: true; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Please enter a valid email address');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Please enter a valid email address');
  }

  const res = await fetch('/api/invite-single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      single_email: normalized,
      invitee_label: typeof inviteeLabel === 'string' && inviteeLabel.trim()
        ? inviteeLabel.trim()
        : null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return { success: true, message: data?.message || 'Invite sent.' };
}

/**
 * Invite another Single by email via the invite-single-referral API route.
 * Requires the caller to be a Single; the edge function enforces this.
 * No DB writes; always sends email. CTA links to app root (Get started / Log in).
 * @param email - Invitee email address
 * @param inviteeLabel - Optional friendly label; used in email as INVITEE_NAME.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSingleReferralByEmail(
  email: string,
  inviteeLabel?: string | null
): Promise<{ success: true; message: string; email_sent?: boolean }> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Please enter a valid email address');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Please enter a valid email address');
  }

  const res = await fetch('/api/invite-single-referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      invitee_email: normalized,
      invitee_label: typeof inviteeLabel === 'string' && inviteeLabel.trim()
        ? inviteeLabel.trim()
        : null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    email_sent?: boolean;
  };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return {
    success: true,
    message: data?.message || 'Invite sent.',
    email_sent: data?.email_sent,
  };
}

/**
 * Invite a sponsor (MatchMakr) by email via the invite-sponsor API route.
 * Branches: CONNECT (sponsor exists) or JOIN (sponsor does not exist).
 * @param inviteeLabel - Optional friendly label; used in email as INVITEE_NAME.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSponsorByEmail(
  email: string,
  inviteeLabel?: string | null
): Promise<{
  success: true;
  message: string;
  mode?: 'connect' | 'join';
  already_pending?: boolean;
  email_sent?: boolean;
}> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Please enter a valid email address');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Please enter a valid email address');
  }

  const res = await fetch('/api/invite-sponsor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      matchmakr_email: normalized,
      invitee_label: typeof inviteeLabel === 'string' && inviteeLabel.trim() ? inviteeLabel.trim() : null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    mode?: 'connect' | 'join';
    already_pending?: boolean;
    email_sent?: boolean;
  };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return {
    success: true,
    message: data?.message || 'Invite sent.',
    mode: data?.mode,
    already_pending: data?.already_pending,
    email_sent: data?.email_sent,
  };
}

/**
 * Invite a person to join Orbit as a Sponsor (JOIN invite).
 * Requires the caller to be a MatchMakr (sponsor); the edge function enforces this.
 * @param email - Invitee email address
 * @param inviteeLabel - Optional friendly label for display (e.g. "Jordan"). Used in email as INVITEE_NAME.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSponsorToJoinByEmail(
  email: string,
  inviteeLabel?: string | null
): Promise<{ success: true; message: string; invite_id?: string; email_sent?: boolean }> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Please enter a valid email address');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Please enter a valid email address');
  }

  const res = await fetch('/api/invite-sponsor-to-join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      invitee_email: normalized,
      invitee_label: typeof inviteeLabel === 'string' && inviteeLabel.trim()
        ? inviteeLabel.trim()
        : null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; invite_id?: string; email_sent?: boolean };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return {
    success: true,
    message: data?.message || 'Invite sent.',
    invite_id: data?.invite_id,
    email_sent: data?.email_sent,
  };
}
