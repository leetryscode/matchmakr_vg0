/**
 * Single Status Computation
 * 
 * Computes deterministic status for managed singles based on database state.
 * Statuses are mutually exclusive and evaluated in priority order.
 */

export type SingleStatus = 'PAUSED' | 'INVITED' | 'NEEDS_ATTENTION' | 'IN_MOTION' | 'NEEDS_INTRODUCTION';

export interface SingleStatusInput {
  paused_at: string | null;
  onboarded_at: string | null;
  photos: (string | null)[] | null;
  matchmakr_endorsement: string | null;
  approved_match_count: number;
}

/**
 * Computes the status for a single based on their profile state and match count.
 *
 * Priority order (mutually exclusive):
 * 1. PAUSED           - paused_at IS NOT NULL
 * 2. INVITED          - onboarded_at IS NULL (single hasn't joined yet)
 * 3. NEEDS_ATTENTION  - onboarded but profile incomplete (missing photo or endorsement)
 * 4. IN_MOTION        - approved_match_count > 0
 * 5. NEEDS_INTRODUCTION - profile ready, no active matches
 *
 * INVITED and NEEDS_ATTENTION are now distinct:
 *   INVITED        = "waiting for them to join" — sponsor can build a draft profile
 *   NEEDS_ATTENTION = "they've joined but the profile isn't ready yet"
 *
 * @param single - Single profile data with match count
 * @returns Computed status
 */
export function computeSingleStatus(single: SingleStatusInput): SingleStatus {
  // 1. PAUSED: Single has paused their activity
  if (single.paused_at !== null) {
    return 'PAUSED';
  }

  // 2. INVITED: Single hasn't completed onboarding yet
  if (single.onboarded_at === null) {
    return 'INVITED';
  }

  // 3. NEEDS_ATTENTION: Onboarded but profile is incomplete (missing photo or endorsement)
  const photosEmpty = !single.photos || single.photos.length === 0;
  const endorsementBlank = !single.matchmakr_endorsement ||
    single.matchmakr_endorsement.trim() === '';

  if (photosEmpty || endorsementBlank) {
    return 'NEEDS_ATTENTION';
  }

  // 4. IN_MOTION: Has active approved matches
  if (single.approved_match_count > 0) {
    return 'IN_MOTION';
  }

  // 5. NEEDS_INTRODUCTION: Profile ready, no active matches
  return 'NEEDS_INTRODUCTION';
}

/**
 * Gets the status label for display
 */
export function getStatusLabel(status: SingleStatus): string {
  switch (status) {
    case 'PAUSED':
      return 'Paused';
    case 'INVITED':
      return 'Invited';
    case 'NEEDS_ATTENTION':
      return 'Needs attention';
    case 'IN_MOTION':
      return 'In motion';
    case 'NEEDS_INTRODUCTION':
      return 'Needs introduction';
  }
}

/**
 * Gets the single-facing status label (never shows INVITED)
 */
export function getSingleFacingStatusLabel(status: SingleStatus): string {
  switch (status) {
    case 'PAUSED':
      return 'Paused';
    case 'NEEDS_ATTENTION':
      return 'Needs attention';
    case 'IN_MOTION':
      return 'In motion';
    case 'NEEDS_INTRODUCTION':
      return 'Available';
    case 'INVITED':
      // This should never be shown to singles, but provide fallback
      return 'Available';
    default:
      return 'Available';
  }
}

/**
 * Gets the single-facing status explanation
 */
export function getSingleFacingStatusExplanation(status: SingleStatus): string {
  switch (status) {
    case 'PAUSED':
      return 'You\'d prefer not to see introductions right now.';
    case 'NEEDS_ATTENTION':
      return 'Your profile is missing something your sponsor needs to make introductions.';
    case 'IN_MOTION':
      return 'You currently have active introductions.';
    case 'NEEDS_INTRODUCTION':
      return 'You are open to introductions.';
    case 'INVITED':
      // This should never be shown to singles, but provide fallback
      return 'You are open to introductions.';
    default:
      return 'You are open to introductions.';
  }
}

/**
 * Gets the status description text for display below the pill
 */
export function getStatusDescription(status: SingleStatus, approvedMatchCount: number): string {
  switch (status) {
    case 'PAUSED':
      return 'Paused';
    case 'INVITED':
      return 'Invite pending';
    case 'NEEDS_ATTENTION':
      return 'Profile needs a quick update';
    case 'IN_MOTION':
      return `${approvedMatchCount} ${approvedMatchCount === 1 ? 'introduction' : 'introductions'} in motion`;
    case 'NEEDS_INTRODUCTION':
      return 'No active introductions yet';
    default:
      return 'No active introductions yet';
  }
}

// --- Centralized alpha tuning ---
const PILL_BG_ALPHA = 0.24;
const PILL_BORDER_ALPHA = 0.28;
const CAPSULE_BORDER_ALPHA = 0.45;
const NEUTRAL_BG_ALPHA = 0.18;

// --- Utility to generate rgb(var(--orbit-*)/alpha) ---
function orbit(token: string, alpha: number): string {
  return `rgb(var(--orbit-${token})/${alpha})`;
}

// --- Map statuses to semantic tokens ---
const STATUS_TOKEN: Record<string, string> = {
  NEEDS_ATTENTION: 'warning',
  PENDING: 'warning',
  AWAITING_APPROVAL: 'warning',

  IN_MOTION: 'success',
  OPEN_TO_IT: 'success',
  ACCEPTED: 'success',

  PAUSED: 'border',
  INVITED: 'border',
  NEEDS_INTRODUCTION: 'border',
  DECLINED: 'border',
  NOT_SURE_YET: 'border',
  DISMISSED: 'border',
  EXPIRED: 'border',
  // Invite system edge cases (future-proof)
  CANCELLED: 'border',
  RESCINDED: 'border',
};

// Pre-built pill/capsule class strings — fully literal so Tailwind content scan finds them.
// Do NOT construct arbitrary-value classes via template strings at runtime.
const PILL_STYLES = {
  warning: 'bg-[rgb(var(--orbit-warning)/0.24)] text-orbit-warning border-[rgb(var(--orbit-warning)/0.28)]',
  success: 'bg-[rgb(var(--orbit-success)/0.24)] text-orbit-success border-[rgb(var(--orbit-success)/0.28)]',
  border: 'bg-[rgb(var(--orbit-border)/0.18)] text-orbit-text2 border-[rgb(var(--orbit-border)/0.28)]',
} as const;
const CAPSULE_STYLES = {
  warning: 'border-2 border-[rgb(var(--orbit-warning)/0.45)]',
  success: 'border-2 border-[rgb(var(--orbit-success)/0.45)]',
  border: 'border-2 border-[rgb(var(--orbit-border)/0.45)]',
} as const;

const PILL_BASE =
  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase';

/**
 * Gets the status pill styling classes (unified for all status types).
 * Uses arbitrary rgb(var(--orbit-*)/alpha) values; no Tailwind safelist required.
 */
export function getStatusPillClasses(status: string): string {
  const token = (STATUS_TOKEN[status] ?? 'border') as keyof typeof PILL_STYLES;
  return `${PILL_BASE} ${PILL_STYLES[token]}`;
}

/**
 * Gets the capsule border classes for preview items.
 * Capsule uses border-2; thicker than pill (1px).
 */
export function getPreviewCapsuleBorderClasses(status: string): string {
  const token = (STATUS_TOKEN[status] ?? 'border') as keyof typeof CAPSULE_STYLES;
  return CAPSULE_STYLES[token];
}

/** Preview response statuses shown to sponsor (PENDING, OPEN_TO_IT, NOT_SURE_YET). */
export type PreviewResponseStatus = 'PENDING' | 'OPEN_TO_IT' | 'NOT_SURE_YET';

/** Base for single-facing preview response option pills (outline only, text-sm). */
const PREVIEW_OPTION_PILL_BASE =
  'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-orbit-surface-1';

const OPTION_PILL_STYLES = {
  success: 'border-[rgb(var(--orbit-success)/0.6)] text-orbit-success',
  border: 'border-[rgb(var(--orbit-border)/0.6)] text-orbit-text2',
} as const;

/**
 * Gets pill styling for single's preview response options ("I'm open to it", "I'm not sure yet").
 * Outline-only: border + text, no bg fill. Distinct from status pills (filled).
 */
export function getPreviewOptionPillClasses(status: 'OPEN_TO_IT' | 'NOT_SURE_YET'): string {
  const token = (STATUS_TOKEN[status] ?? 'border') as keyof typeof OPTION_PILL_STYLES;
  return `${PREVIEW_OPTION_PILL_BASE} ${OPTION_PILL_STYLES[token]}`;
}

/** Invite row statuses (Managed Singles grid). */
export type InviteRowStatus = 'INVITED' | 'AWAITING_APPROVAL' | 'ACCEPTED' | 'DECLINED';

// Example test cases (for documentation/sanity checking):
//
// Example 1: INVITED (onboarded_at null — hasn't joined yet)
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: null,
//   photos: [],
//   matchmakr_endorsement: null,
//   approved_match_count: 0
// }) => 'INVITED'
//
// Example 2: INVITED even if sponsor pre-filled draft fields (still hasn't joined)
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: null,
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 0
// }) => 'INVITED'
//
// Example 3: NEEDS_ATTENTION (onboarded, but missing photos)
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: [],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 0
// }) => 'NEEDS_ATTENTION'
//
// Example 4: NEEDS_ATTENTION (onboarded, but missing endorsement)
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: '',
//   approved_match_count: 0
// }) => 'NEEDS_ATTENTION'
//
// Example 5: IN_MOTION
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 2
// }) => 'IN_MOTION'
//
// Example 6: NEEDS_INTRODUCTION
// computeSingleStatus({
//   paused_at: null,
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 0
// }) => 'NEEDS_INTRODUCTION'

