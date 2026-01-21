/**
 * Single Status Computation
 * 
 * Computes deterministic status for managed singles based on database state.
 * Statuses are mutually exclusive and evaluated in priority order.
 */

export type SingleStatus = 'INVITED' | 'NEEDS_ATTENTION' | 'IN_MOTION' | 'NEEDS_INTRODUCTION';

export interface SingleStatusInput {
  onboarded_at: string | null;
  photos: (string | null)[] | null;
  matchmakr_endorsement: string | null;
  approved_match_count: number;
}

/**
 * Computes the status for a single based on their profile state and match count.
 * 
 * Priority order (mutually exclusive):
 * 1. INVITED - onboarded_at is NULL
 * 2. NEEDS_ATTENTION - photos array is empty OR matchmakr_endorsement is null/blank
 * 3. IN_MOTION - approved_match_count > 0
 * 4. NEEDS_INTRODUCTION - default if none of the above match
 * 
 * @param single - Single profile data with match count
 * @returns Computed status
 */
export function computeSingleStatus(single: SingleStatusInput): SingleStatus {
  // 1. INVITED: Single has not completed onboarding
  if (single.onboarded_at === null) {
    return 'INVITED';
  }

  // 2. NEEDS_ATTENTION: Profile is incomplete
  // Check if photos array is empty (array_length(photos, 1) = 0 in SQL)
  const photosEmpty = !single.photos || single.photos.length === 0;
  // Check if endorsement is null or blank (using trim())
  const endorsementBlank = !single.matchmakr_endorsement || 
                           single.matchmakr_endorsement.trim() === '';
  
  if (photosEmpty || endorsementBlank) {
    return 'NEEDS_ATTENTION';
  }

  // 3. IN_MOTION: Has active approved matches
  if (single.approved_match_count > 0) {
    return 'IN_MOTION';
  }

  // 4. NEEDS_INTRODUCTION: Default state - onboarded, complete profile, no active matches
  return 'NEEDS_INTRODUCTION';
}

/**
 * Gets the status label for display
 */
export function getStatusLabel(status: SingleStatus): string {
  switch (status) {
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
 * Gets the status description text for display below the pill
 */
export function getStatusDescription(status: SingleStatus, approvedMatchCount: number): string {
  switch (status) {
    case 'INVITED':
      return 'Invite pending';
    case 'NEEDS_ATTENTION':
      return 'Profile needs a quick update';
    case 'IN_MOTION':
      return `${approvedMatchCount} ${approvedMatchCount === 1 ? 'introduction' : 'introductions'} in motion`;
    case 'NEEDS_INTRODUCTION':
      return 'No active introductions yet';
  }
}

/**
 * Gets the status pill styling classes
 */
export function getStatusStyles(status: SingleStatus): string {
  switch (status) {
    case 'INVITED':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/20';
    case 'NEEDS_ATTENTION':
      return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20';
    case 'IN_MOTION':
      return 'bg-green-500/15 text-green-300 border-green-500/20';
    case 'NEEDS_INTRODUCTION':
      return 'bg-white/10 text-white/90 border-white/10';
  }
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

