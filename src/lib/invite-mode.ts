/**
 * Invite mode state for onboarding flow.
 * Persisted in sessionStorage so it survives navigation to /onboarding.
 */

const STORAGE_KEY = 'orbit_invite_mode';

export type InviteMode = {
  inviteToken: string;
  lockedRole: 'SPONSOR' | 'SINGLE';
  prefillName: string | null;
  prefillEmail: string | null;
  prefillCommunity: string | null;
};

export function getInviteMode(): InviteMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InviteMode;
    if (!parsed.inviteToken || !parsed.lockedRole) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setInviteMode(mode: InviteMode): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch {
    // ignore
  }
}

export function clearInviteMode(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
