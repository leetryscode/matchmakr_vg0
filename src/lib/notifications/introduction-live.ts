import { createClient } from '@supabase/supabase-js';

/**
 * Creates "introduction_live" notifications for both sponsors when an introduction
 * goes live (both sponsors have agreed).
 *
 * Guardrails:
 * - Dedupe: at most one notification per (user_id, intro_id) ever.
 * - Safe for API retries: checks for existing before insert.
 */
export async function createIntroductionLiveNotifications(
  introId: string,
  matchmakrAId: string,
  matchmakrBId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
  singleAId?: string,
  singleBId?: string
): Promise<void> {
  try {
    if (!serviceRoleKey) {
      console.error('[IntroductionLiveNotifications] SUPABASE_SERVICE_ROLE_KEY is not set');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const sponsorIds = [matchmakrAId, matchmakrBId];

    // Dedupe: check for existing introduction_live notifications per sponsor
    const eligibleSponsorIds: string[] = [];
    for (const sponsorId of sponsorIds) {
      const { data: existing, error } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', sponsorId)
        .eq('type', 'introduction_live')
        .eq('data->>intro_id', introId)
        .maybeSingle();

      if (error) {
        console.error('[IntroductionLiveNotifications] Error checking existing notification:', error);
        continue;
      }
      if (!existing) {
        eligibleSponsorIds.push(sponsorId);
      }
    }

    if (eligibleSponsorIds.length === 0) {
      return;
    }

    // Fetch single names for polished body text
    let singleAName: string | null = null;
    let singleBName: string | null = null;
    if (singleAId || singleBId) {
      const ids = [singleAId, singleBId].filter(Boolean) as string[];
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', ids);
      if (profiles) {
        for (const p of profiles) {
          if (p.id === singleAId) singleAName = p.name ?? null;
          if (p.id === singleBId) singleBName = p.name ?? null;
        }
      }
    }

    const baseData: Record<string, unknown> = {
      intro_id: introId,
      matchmakr_a_id: matchmakrAId,
      matchmakr_b_id: matchmakrBId,
    };
    if (singleAId) baseData.single_a_id = singleAId;
    if (singleBId) baseData.single_b_id = singleBId;
    if (singleAName) baseData.single_a_name = singleAName;
    if (singleBName) baseData.single_b_name = singleBName;

    const notificationsToInsert = eligibleSponsorIds.map((sponsorId) => ({
      user_id: sponsorId,
      type: 'introduction_live',
      data: baseData,
      read: false,
      dismissed_at: null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('[IntroductionLiveNotifications] Error inserting notifications:', insertError);
      return;
    }

    console.log(
      `[IntroductionLiveNotifications] Created ${notificationsToInsert.length} notifications for intro ${introId}`
    );
  } catch (err) {
    console.error('[IntroductionLiveNotifications] Unexpected error:', err);
  }
}
