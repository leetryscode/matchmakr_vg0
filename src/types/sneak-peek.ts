/**
 * Sneak Peek Type Definitions
 * 
 * Types for the Sneak Peek feature - a sponsor-led introduction preview system.
 * Singles respond with low-commitment signals (open to it, not sure yet, dismiss).
 * No automatic actions occur - sponsor interprets signals and decides what to do.
 */

export type SneakPeekStatus = 
    | 'PENDING'        // Awaiting response from single
    | 'OPEN_TO_IT'     // Single is open to the introduction
    | 'NOT_SURE_YET'   // Single is not sure yet
    | 'DISMISSED'      // Single dismissed the preview
    | 'EXPIRED';       // Sneak peek expired (for future use)

export interface SneakPeek {
    id: string;
    recipient_single_id: string;
    from_sponsor_id: string;
    target_single_id: string;
    photo_url: string; // Snapshot of first profile photo at creation time
    status: SneakPeekStatus;
    created_at: string;
    expires_at: string; // created_at + 48 hours
    responded_at: string | null;
}

export interface SneakPeekWithRelations extends SneakPeek {
    recipient_name?: string | null;
    target_name?: string | null;
}

export interface SendSneakPeekRequest {
    recipientSingleId: string;
    targetSingleId: string;
}

export interface SendSneakPeekResponse {
    success: boolean;
    sneakPeek: SneakPeek;
}

export interface ListSneakPeeksResponse {
    success: boolean;
    sneakPeeks: SneakPeek[] | SneakPeekWithRelations[];
}

export interface RespondToSneakPeekRequest {
    status: 'OPEN_TO_IT' | 'NOT_SURE_YET' | 'DISMISSED';
}

export interface RespondToSneakPeekResponse {
    success: boolean;
    sneakPeek: SneakPeek;
}

