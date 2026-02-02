import { createClient } from '@supabase/supabase-js';

const NUDGE_TYPE = 'nudge_invite_single';
const COOLDOWN_HOURS = 24;

/**
 * Ensures "nudge_invite_single" notification for a MATCHMAKR user with no sponsored singles.
 * - Condition unmet: no profiles with sponsored_by_id = this sponsor and user_type = SINGLE
 * - 24h cooldown: skip if notification of this type created in last 24h
 * - On condition met: auto-dismiss any active nudge of this type
 *
 * Non-blocking, logs errors, never throws.
 */
export async function ensureNudgeInviteSingle(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    if (!serviceRoleKey) {
      console.error('[NudgeInviteSingle] SUPABASE_SERVICE_ROLE_KEY is not set');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Condition check: does sponsor have any singles?
    const { data: singles, error: singlesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('sponsored_by_id', userId)
      .eq('user_type', 'SINGLE')
      .limit(1);

    if (singlesError) {
      console.error('[NudgeInviteSingle] Error checking sponsored singles:', singlesError);
      return;
    }

    const hasSingles = singles && singles.length > 0;

    // Condition met: sponsor has singles -> cleanup and exit
    if (hasSingles) {
      const { error: dismissError } = await supabaseAdmin
        .from('notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', NUDGE_TYPE)
        .is('dismissed_at', null);

      if (dismissError) {
        console.error('[NudgeInviteSingle] Error dismissing satisfied nudges:', dismissError);
      }
      return;
    }

    // Condition unmet: check 24h cooldown
    const cooldownThreshold = new Date(
      Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: recent, error: cooldownError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', NUDGE_TYPE)
      .gt('created_at', cooldownThreshold)
      .limit(1)
      .maybeSingle();

    if (cooldownError) {
      console.error('[NudgeInviteSingle] Error checking cooldown:', cooldownError);
      return;
    }
    if (recent) {
      return; // Within cooldown
    }

    // Insert nudge
    const { error: insertError } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: NUDGE_TYPE,
      data: { reason: 'sponsor_without_singles', created_by: 'system' },
      read: false,
      dismissed_at: null,
    });

    if (insertError) {
      console.error('[NudgeInviteSingle] Error inserting notification:', insertError);
    } else {
      console.log(`[NudgeInviteSingle] Created nudge for user ${userId}`);
    }
  } catch (err) {
    console.error('[NudgeInviteSingle] Unexpected error:', err);
  }
}
