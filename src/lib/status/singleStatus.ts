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
 * 1. PAUSED - paused_at is NOT NULL
 * 2. NEEDS_ATTENTION - profile not ready (missing photo or endorsement)
 * 3. INVITED - onboarded_at is NULL and profile not ready (subsumed by NEEDS_ATTENTION above)
 * 4. IN_MOTION - approved_match_count > 0
 * 5. NEEDS_INTRODUCTION - profile ready, no active matches (even if onboarded_at is null)
 *
 * "Needs attention" strictly means profile is missing required sponsor inputs.
 * If onboarded_at is null but profile is ready (photos + endorsement) → NEEDS_INTRODUCTION or IN_MOTION.
 *
 * @param single - Single profile data with match count
 * @returns Computed status
 */
export function computeSingleStatus(single: SingleStatusInput): SingleStatus {
  // 1. PAUSED: Single has paused their activity
  if (single.paused_at !== null) {
    return 'PAUSED';
  }

  // 2. NEEDS_ATTENTION: Profile is incomplete (missing photo or endorsement)
  const photosEmpty = !single.photos || single.photos.length === 0;
  const endorsementBlank = !single.matchmakr_endorsement ||
    single.matchmakr_endorsement.trim() === '';

  if (photosEmpty || endorsementBlank) {
    return 'NEEDS_ATTENTION';
  }

  // 3. Profile is ready. INVITED only when onboarded_at null + profile not ready (handled above).
  // If onboarded_at is null but profile ready → treat as NEEDS_INTRODUCTION or IN_MOTION.

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

/** Base classes for all status pills (outline-only, no fill; border-2; text matches border). */
const STATUS_PILL_BASE =
  'inline-flex items-center rounded-full border-2 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase bg-transparent';

/** Sponsor/MatchMakr: color classes only (border + text) per status. */
const STATUS_COLOR: Record<SingleStatus, string> = {
  PAUSED: 'border-status-paused text-status-paused',
  INVITED: 'border-status-invited text-status-invited',
  NEEDS_ATTENTION: 'border-status-needs-attention text-status-needs-attention',
  IN_MOTION: 'border-status-in-motion text-status-in-motion',
  NEEDS_INTRODUCTION: 'border-status-needs-introduction text-status-needs-introduction',
};

/** Single-facing: same tokens; INVITED uses needs_introduction color (shown as "Available"). */
const SINGLE_FACING_STATUS_COLOR: Record<SingleStatus, string> = {
  PAUSED: 'border-status-paused text-status-paused',
  INVITED: 'border-status-needs-introduction text-status-needs-introduction',
  NEEDS_ATTENTION: 'border-status-needs-attention text-status-needs-attention',
  IN_MOTION: 'border-status-in-motion text-status-in-motion',
  NEEDS_INTRODUCTION: 'border-status-needs-introduction text-status-needs-introduction',
};

/**
 * Gets the status pill styling classes (sponsor/MatchMakr).
 * Outline-only: bg-transparent, border + text use status tokens.
 */
export function getStatusStyles(status: SingleStatus): string {
  return `${STATUS_PILL_BASE} ${STATUS_COLOR[status]}`;
}

/**
 * Gets the single-facing status pill styling classes.
 * Same outline-only pattern; INVITED uses needs_introduction color (label "Available").
 */
export function getSingleFacingStatusStyles(status: SingleStatus): string {
  return `${STATUS_PILL_BASE} ${SINGLE_FACING_STATUS_COLOR[status]}`;
}

/** Preview response statuses shown to sponsor (PENDING, OPEN_TO_IT, NOT_SURE_YET). */
export type PreviewResponseStatus = 'PENDING' | 'OPEN_TO_IT' | 'NOT_SURE_YET';

/**
 * Color mapping for preview response pills (SneakPeeksSection).
 * PENDING → needs_attention (amber, sponsor action needed)
 * OPEN_TO_IT → in_motion (green, positive momentum)
 * NOT_SURE_YET → paused (violet, neutral/reflective)
 */
const PREVIEW_RESPONSE_STATUS_COLOR: Record<PreviewResponseStatus, string> = {
  PENDING: 'border-status-needs-attention text-status-needs-attention',
  OPEN_TO_IT: 'border-status-in-motion text-status-in-motion',
  NOT_SURE_YET: 'border-status-paused text-status-paused',
};

/**
 * Gets the status pill styling for preview response statuses (sponsor view).
 * Reuses same outline-only base as managed single pills.
 */
export function getPreviewResponseStatusStyles(status: PreviewResponseStatus): string {
  return `${STATUS_PILL_BASE} ${PREVIEW_RESPONSE_STATUS_COLOR[status]}`;
}

/**
 * Gets the capsule outline class for preview response items.
 * Uses status color at ~50% opacity; thinner than pill (border, not border-2).
 * Creates visual link between capsule and status pill.
 */
const PREVIEW_RESPONSE_CAPSULE_BORDER: Record<PreviewResponseStatus, string> = {
  PENDING: 'border-status-needs-attention/50',
  OPEN_TO_IT: 'border-status-in-motion/50',
  NOT_SURE_YET: 'border-status-paused/50',
};

export function getPreviewResponseCapsuleBorder(status: PreviewResponseStatus): string {
  return `border ${PREVIEW_RESPONSE_CAPSULE_BORDER[status]}`;
}

/** Base for single-facing preview response option pills (no uppercase, sentence case). */
const PREVIEW_OPTION_PILL_BASE =
  'inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-semibold bg-transparent';

/**
 * Gets pill styling for single's preview response options ("I'm open to it", "I'm not sure yet").
 * Same colors as sponsor view; no uppercase so copy stays sentence case.
 */
export function getPreviewResponseOptionStyles(status: 'OPEN_TO_IT' | 'NOT_SURE_YET'): string {
  const colors: Record<'OPEN_TO_IT' | 'NOT_SURE_YET', string> = {
    OPEN_TO_IT: 'border-status-in-motion text-status-in-motion',
    NOT_SURE_YET: 'border-status-paused text-status-paused',
  };
  return `${PREVIEW_OPTION_PILL_BASE} ${colors[status]}`;
}

// Example test cases (for documentation/sanity checking):
// 
// Example 1: INVITED
// computeSingleStatus({
//   onboarded_at: null,
//   photos: [],
//   matchmakr_endorsement: null,
//   approved_match_count: 0
// }) => 'INVITED'
//
// Example 2: NEEDS_ATTENTION (no photos)
// computeSingleStatus({
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: [],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 0
// }) => 'NEEDS_ATTENTION'
//
// Example 3: NEEDS_ATTENTION (no endorsement)
// computeSingleStatus({
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: '',
//   approved_match_count: 0
// }) => 'NEEDS_ATTENTION'
//
// Example 4: IN_MOTION
// computeSingleStatus({
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 2
// }) => 'IN_MOTION'
//
// Example 5: NEEDS_INTRODUCTION
// computeSingleStatus({
//   onboarded_at: '2024-01-01T00:00:00Z',
//   photos: ['photo1.jpg'],
//   matchmakr_endorsement: 'Great person',
//   approved_match_count: 0
// }) => 'NEEDS_INTRODUCTION'

