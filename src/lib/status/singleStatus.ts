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
 * 2. INVITED - onboarded_at is NULL
 * 3. NEEDS_ATTENTION - photos array is empty OR matchmakr_endorsement is null/blank
 * 4. IN_MOTION - approved_match_count > 0
 * 5. NEEDS_INTRODUCTION - default if none of the above match
 * 
 * @param single - Single profile data with match count
 * @returns Computed status
 */
export function computeSingleStatus(single: SingleStatusInput): SingleStatus {
  // 1. PAUSED: Single has paused their activity
  if (single.paused_at !== null) {
    return 'PAUSED';
  }

  // 2. INVITED: Single has not completed onboarding
  if (single.onboarded_at === null) {
    return 'INVITED';
  }

  // 3. NEEDS_ATTENTION: Profile is incomplete
  // Check if photos array is empty (array_length(photos, 1) = 0 in SQL)
  const photosEmpty = !single.photos || single.photos.length === 0;
  // Check if endorsement is null or blank (using trim())
  const endorsementBlank = !single.matchmakr_endorsement || 
                           single.matchmakr_endorsement.trim() === '';
  
  if (photosEmpty || endorsementBlank) {
    return 'NEEDS_ATTENTION';
  }

  // 4. IN_MOTION: Has active approved matches
  if (single.approved_match_count > 0) {
    return 'IN_MOTION';
  }

  // 5. NEEDS_INTRODUCTION: Default state - onboarded, complete profile, no active matches
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

