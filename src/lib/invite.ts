/**
 * Canonical invite helpers. Callers handle router.refresh().
 */

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Invite a single by email via the invite-single API route.
 * Requires the caller to be a MatchMakr (sponsor); the edge function enforces this.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSingleByEmail(
  email: string,
  sponsorLabel?: string | null
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
      sponsor_label: typeof sponsorLabel === 'string' ? sponsorLabel.trim() || null : null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return { success: true, message: data?.message || 'Invite sent.' };
}

/**
 * Invite a sponsor (MatchMakr) by email via the invite-sponsor API route.
 * Single chooses a sponsor; the edge function links them directly.
 * @throws Error with friendly message on non-2xx
 */
export async function inviteSponsorByEmail(email: string): Promise<{ success: true; message: string }> {
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
    body: JSON.stringify({ matchmakr_email: normalized }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

  if (!res.ok) {
    throw new Error(data?.error || 'An error occurred.');
  }

  return { success: true, message: data?.message || 'Invite sent successfully!' };
}
