/**
 * Invite display status computation
 *
 * Centralizes status logic for invite rows so it isn't duplicated across components.
 * Uses invite.status and optional sponsorship_request.status. Case-insensitive.
 *
 * Input contract (safe fallbacks for future DB migrations):
 * - inviteStatus null/unknown → INVITED, neutral subtext
 * - requestStatus unknown → ignore, fall back to inviteStatus
 */

export type InviteDisplayStatus = 'INVITED' | 'AWAITING_APPROVAL' | 'ACCEPTED' | 'DECLINED';
export type DeclineSubtext = 'expired' | 'cancelled' | null;

export interface InviteStatusResult {
  displayStatus: InviteDisplayStatus;
  subtext: DeclineSubtext;
  isClickable: boolean;
}

/**
 * Compute display status, subtext, and isClickable for an invite row.
 *
 * @param inviteStatus - invites.status (PENDING, CLAIMED, CANCELLED, EXPIRED, ACCEPTED, DECLINED)
 * @param requestStatus - sponsorship_requests.status when present (PENDING_SINGLE_APPROVAL, ACCEPTED, DECLINED)
 * @param inviteeUserId - invitee_user_id; required for isClickable when ACCEPTED
 */
export function getInviteDisplayStatus(
  inviteStatus: string,
  requestStatus: string | null | undefined,
  inviteeUserId: string | null | undefined
): InviteStatusResult {
  const inv = (inviteStatus ?? '').trim().toUpperCase();
  const req = (requestStatus ?? '').trim().toUpperCase();

  // Only use request when it's a known status; unknown → fall back to invite
  const hasKnownRequest =
    req === 'PENDING_SINGLE_APPROVAL' || req === 'ACCEPTED' || req === 'DECLINED';

  let displayStatus: InviteDisplayStatus = 'INVITED';
  if (hasKnownRequest) {
    if (req === 'PENDING_SINGLE_APPROVAL') displayStatus = 'AWAITING_APPROVAL';
    else if (req === 'ACCEPTED') displayStatus = 'ACCEPTED';
    else if (req === 'DECLINED') displayStatus = 'DECLINED';
    else displayStatus = 'INVITED';
  } else {
    // inviteStatus null/unknown → INVITED (safe fallback)
    if (inv === 'PENDING') displayStatus = 'INVITED';
    else if (inv === 'ACCEPTED') displayStatus = 'ACCEPTED';
    else if (['DECLINED', 'EXPIRED', 'CANCELLED'].includes(inv)) displayStatus = 'DECLINED';
    else displayStatus = 'INVITED';
  }

  let subtext: DeclineSubtext = null;
  if (displayStatus === 'DECLINED' && !hasKnownRequest) {
    if (inv === 'EXPIRED') subtext = 'expired';
    else if (inv === 'CANCELLED') subtext = 'cancelled';
  }

  const isClickable = displayStatus === 'ACCEPTED' && !!inviteeUserId;

  return { displayStatus, subtext, isClickable };
}
