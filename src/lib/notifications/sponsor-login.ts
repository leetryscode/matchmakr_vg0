import { createClient } from '@supabase/supabase-js';

/**
 * Cooldown period for sponsor-login notifications (24 hours)
 */
const SPONSOR_LOGIN_COOLDOWN_HOURS = 24;

/**
 * Creates sponsor-login activity notifications for sponsored singles.
 * Only creates notifications when guardrails are met:
 * 1. Single has no active notifications
 * 2. No sponsor_logged_in notification created in last 24 hours
 * 3. No duplicates in same request
 * 
 * This function is non-blocking and logs errors instead of throwing.
 */
export async function createSponsorLoginNotifications(
  sponsorId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    // Validate service role key
    if (!serviceRoleKey) {
      console.error('[SponsorLoginNotifications] SUPABASE_SERVICE_ROLE_KEY is not set');
      return;
    }

    // Create service role client for inserts (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Relevance guard: only fetch singles who have this sponsor (sponsored_by_id = sponsorId)
    const { data: sponsoredSingles, error: singlesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('sponsored_by_id', sponsorId)
      .eq('user_type', 'SINGLE');

    if (singlesError) {
      console.error('[SponsorLoginNotifications] Error fetching sponsored singles:', singlesError);
      return;
    }

    if (!sponsoredSingles || sponsoredSingles.length === 0) {
      // No sponsored singles, nothing to do
      return;
    }

    const singleIds = sponsoredSingles.map((s) => s.id);
    const cooldownThreshold = new Date(Date.now() - SPONSOR_LOGIN_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

    // Check guardrails: fetch all relevant notifications in two queries for clarity
    // Guardrail 1: Check for active notifications (dismissed_at IS NULL)
    const { data: activeNotifications, error: activeError } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .in('user_id', singleIds)
      .is('dismissed_at', null);

    if (activeError) {
      console.error('[SponsorLoginNotifications] Error checking active notifications:', activeError);
      return;
    }

    // Guardrail 2: Check for sponsor_logged_in notifications within cooldown (regardless of dismissed_at)
    const { data: cooldownNotifications, error: cooldownError } = await supabaseAdmin
      .from('notifications')
      .select('user_id, created_at')
      .in('user_id', singleIds)
      .eq('type', 'sponsor_logged_in')
      .gt('created_at', cooldownThreshold);

    if (cooldownError) {
      console.error('[SponsorLoginNotifications] Error checking cooldown notifications:', cooldownError);
      return;
    }

    // Build sets of single IDs that should NOT get notifications
    const singlesWithActiveNotifications = new Set<string>();
    const singlesInCooldown = new Set<string>();

    // Guardrail 1: Singles with any active notifications
    if (activeNotifications) {
      for (const notif of activeNotifications) {
        singlesWithActiveNotifications.add(notif.user_id);
      }
    }

    // Guardrail 2: Singles with sponsor_logged_in notification within cooldown
    if (cooldownNotifications) {
      for (const notif of cooldownNotifications) {
        singlesInCooldown.add(notif.user_id);
      }
    }

    // Determine which singles are eligible for notifications
    const eligibleSingleIds = singleIds.filter(
      (singleId) =>
        !singlesWithActiveNotifications.has(singleId) && !singlesInCooldown.has(singleId)
    );

    if (eligibleSingleIds.length === 0) {
      // No eligible singles, nothing to do
      return;
    }

    // Randomly choose body message for this batch
    // All messages convey the same truth: your sponsor is engaged
    const MESSAGES = [
      'Your sponsor is actively reviewing matches.',
      'Your sponsor is working on introductions.',
      'Your sponsor is spending time in Orbit.',
      'Your sponsor is exploring potential matches.',
      'Your sponsor is making thoughtful connections.',
    ];
    const randomIndex = Math.floor(Math.random() * MESSAGES.length);
    const bodyMessage = MESSAGES[randomIndex];

    // Create notifications for eligible singles
    // Store the message in data so it's consistent across renders
    const notificationsToInsert = eligibleSingleIds.map((singleId) => ({
      user_id: singleId,
      type: 'sponsor_logged_in',
      data: {
        sponsor_id: sponsorId,
        kind: 'login',
        message: bodyMessage,
      },
      dismissed_at: null,
      read: false,
    }));

    // Insert notifications (batch insert)
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('[SponsorLoginNotifications] Error inserting notifications:', insertError);
    } else {
      console.log(
        `[SponsorLoginNotifications] Created ${notificationsToInsert.length} notifications for sponsor ${sponsorId}`
      );
    }
  } catch (error) {
    // Catch-all error handling - don't throw, just log
    console.error('[SponsorLoginNotifications] Unexpected error:', error);
  }
}
