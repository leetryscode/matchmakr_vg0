import { createClient } from '@supabase/supabase-js';

/**
 * Minimum delay before checking if single has seen intro (48 hours)
 */
const INTRO_VIEW_CHECK_DELAY_HOURS = 48;

/**
 * Creates notifications for sponsors when their singles haven't viewed introductions.
 * Checks opportunistically when sponsor loads dashboard.
 * 
 * Guardrails:
 * 1. Intro created_at < now() - 48 hours
 * 2. Single has NOT logged in since intro creation (last_sign_in_at < intro.created_at OR NULL)
 * 3. No existing 'single_not_seen_intro' notification for this intro
 * 4. Only one notification per intro
 * 
 * This function is non-blocking and logs errors instead of throwing.
 */
export async function checkAndCreateSingleNotSeenIntroNotifications(
  sponsorId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    // Validate service role key
    if (!serviceRoleKey) {
      console.error('[SingleNotSeenIntro] SUPABASE_SERVICE_ROLE_KEY is not set');
      return;
    }

    // Create service role client for accessing auth.users and inserting notifications
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Calculate threshold: intros created before this time are eligible for checking
    const checkThreshold = new Date(
      Date.now() - INTRO_VIEW_CHECK_DELAY_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Find all intros (matches) where:
    // 1. Sponsor is matchmakr_a_id OR matchmakr_b_id
    // 2. Created more than 48 hours ago
    // 3. Intro involves sponsored singles
    const { data: intros, error: introsError } = await supabaseAdmin
      .from('matches')
      .select('id, single_a_id, single_b_id, matchmakr_a_id, matchmakr_b_id, created_at')
      .or(`matchmakr_a_id.eq.${sponsorId},matchmakr_b_id.eq.${sponsorId}`)
      .lt('created_at', checkThreshold);

    if (introsError) {
      console.error('[SingleNotSeenIntro] Error fetching intros:', introsError);
      return;
    }

    if (!intros || intros.length === 0) {
      // No eligible intros, nothing to do
      return;
    }

    // Get all intro IDs to check for existing notifications
    const introIds = intros.map((intro) => intro.id);

    // Check for existing 'single_not_seen_intro' notifications for these intros
    const { data: existingNotifications, error: notifCheckError } = await supabaseAdmin
      .from('notifications')
      .select('data')
      .eq('type', 'single_not_seen_intro')
      .in('user_id', [sponsorId]);

    if (notifCheckError) {
      console.error('[SingleNotSeenIntro] Error checking existing notifications:', notifCheckError);
      return;
    }

    // Build set of intro IDs that already have notifications
    const introsWithNotifications = new Set<string>();
    if (existingNotifications) {
      for (const notif of existingNotifications) {
        const introId = notif.data?.intro_id;
        if (introId) {
          introsWithNotifications.add(introId);
        }
      }
    }

    // For each intro, determine which singles belong to this sponsor
    const notificationsToInsert: Array<{
      user_id: string;
      type: string;
      data: { intro_id: string; single_id: string };
      dismissed_at: null;
      read: boolean;
    }> = [];
    
    // Track intros we've already created notifications for in this batch (prevent duplicates)
    const processedIntroIds = new Set<string>();

    for (const intro of intros) {
      // Skip if notification already exists for this intro
      if (introsWithNotifications.has(intro.id) || processedIntroIds.has(intro.id)) {
        continue;
      }

      // Determine which singles belong to this sponsor
      // An intro involves two singles: single_a (sponsored by matchmakr_a) and single_b (sponsored by matchmakr_b)
      // We need to check BOTH singles and notify ONLY the sponsor who actually sponsors each single
      const singlesToCheck = [
        { id: intro.single_a_id, expectedSponsorId: intro.matchmakr_a_id },
        { id: intro.single_b_id, expectedSponsorId: intro.matchmakr_b_id },
      ];

      for (const { id: singleId, expectedSponsorId } of singlesToCheck) {
        // Only proceed if this sponsor actually sponsors this single
        if (expectedSponsorId !== sponsorId) {
          continue;
        }

        // Double-check: Verify this single is actually sponsored by this sponsor
        // (This is the critical guard to ensure Sponsor A doesn't get notified about Sponsor B's single)
        const { data: singleProfile, error: singleError } = await supabaseAdmin
          .from('profiles')
          .select('id, sponsored_by_id')
          .eq('id', singleId)
          .single();

        if (singleError || !singleProfile || singleProfile.sponsored_by_id !== sponsorId) {
          // Mismatch - skip this single (shouldn't happen if data is consistent, but safety check)
          continue;
        }

        // Check if single has logged in since intro creation
        // Use auth.users.last_sign_in_at to determine login time
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
          singleId
        );

        if (authError) {
          console.error(`[SingleNotSeenIntro] Error checking auth for single ${singleId}:`, authError);
          continue;
        }

        // Determine if single has logged in since intro creation
        const introCreatedAt = new Date(intro.created_at);
        const lastSignInAt = authUser?.user?.last_sign_in_at
          ? new Date(authUser.user.last_sign_in_at)
          : null;

        // If last_sign_in_at is NULL or before intro creation, single hasn't logged in since intro
        const hasNotLoggedInSinceIntro =
          !lastSignInAt || lastSignInAt < introCreatedAt;

        if (hasNotLoggedInSinceIntro) {
          // Single hasn't logged in since intro creation - create notification
          // Only create one notification per intro (even if sponsor is both matchmakrs)
          notificationsToInsert.push({
            user_id: sponsorId,
            type: 'single_not_seen_intro',
            data: {
              intro_id: intro.id,
              single_id: singleId,
            },
            dismissed_at: null,
            read: false,
          });
          
          // Mark this intro as processed to prevent duplicate notifications in this batch
          processedIntroIds.add(intro.id);
          
          // Break after first notification for this intro (only one notification per intro)
          break;
        }
      }
    }

    if (notificationsToInsert.length === 0) {
      // No notifications to create
      return;
    }

    // Insert notifications (batch insert)
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('[SingleNotSeenIntro] Error inserting notifications:', insertError);
    } else {
      console.log(
        `[SingleNotSeenIntro] Created ${notificationsToInsert.length} notifications for sponsor ${sponsorId}`
      );
    }
  } catch (error) {
    // Catch-all error handling - don't throw, just log
    console.error('[SingleNotSeenIntro] Unexpected error:', error);
  }
}
