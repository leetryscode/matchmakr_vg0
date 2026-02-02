import { createClient } from '@supabase/supabase-js';

const NUDGE_TYPE = 'nudge_invite_sponsor';
const COOLDOWN_HOURS = 24;

/**
 * Ensures "nudge_invite_sponsor" notification for a SINGLE user without a sponsor.
 * - Condition unmet: sponsored_by_id is null
 * - 24h cooldown: skip if notification of this type created in last 24h
 * - On condition met: auto-dismiss any active nudge of this type
 *
 * Non-blocking, logs errors, never throws.
 */
export async function ensureNudgeInviteSponsor(
  userId: string,
  sponsoredById: string | null | undefined,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    if (!serviceRoleKey) {
      console.error('[NudgeInviteSponsor] SUPABASE_SERVICE_ROLE_KEY is not set');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Condition met: single has a sponsor -> cleanup and exit
    if (sponsoredById) {
      const { error: dismissError } = await supabaseAdmin
        .from('notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', NUDGE_TYPE)
        .is('dismissed_at', null);

      if (dismissError) {
        console.error('[NudgeInviteSponsor] Error dismissing satisfied nudges:', dismissError);
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
      console.error('[NudgeInviteSponsor] Error checking cooldown:', cooldownError);
      return;
    }
    if (recent) {
      return; // Within cooldown
    }

    // Insert nudge
    const { error: insertError } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: NUDGE_TYPE,
      data: { reason: 'single_without_sponsor', created_by: 'system' },
      read: false,
      dismissed_at: null,
    });

    if (insertError) {
      console.error('[NudgeInviteSponsor] Error inserting notification:', insertError);
    } else {
      console.log(`[NudgeInviteSponsor] Created nudge for user ${userId}`);
    }
  } catch (err) {
    console.error('[NudgeInviteSponsor] Unexpected error:', err);
  }
}
