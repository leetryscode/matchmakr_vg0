import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log(`Function "end-sponsorship" up and running!`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { single_id } = await req.json().catch(() => ({})); // Allow empty body for singles

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the profile of the user calling the function
    const { data: callingUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Could not find your profile.');

    let targetSingleId = null;

    let sponsorId: string | null = null;

    if (callingUserProfile.user_type === 'SINGLE') {
      // If a Single calls this, they are ending their own sponsorship.
      targetSingleId = user.id;
      // Read sponsor_id before clearing (for invite/request cleanup)
      const { data: singleProfile, error: singleProfileError } = await supabaseAdmin
        .from('profiles')
        .select('sponsored_by_id')
        .eq('id', targetSingleId)
        .single();
      if (singleProfileError) throw new Error('Could not find your profile.');
      sponsorId = singleProfile?.sponsored_by_id ?? null;
      // Idempotent: already no sponsor
      if (!sponsorId) {
        return new Response(JSON.stringify({ message: 'Sponsorship ended successfully.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else if (callingUserProfile.user_type === 'MATCHMAKR') {
      // If a MatchMakr calls this, they must specify which single to release.
      if (!single_id) {
        throw new Error('MatchMakr must provide the ID of the single to release.');
      }

      // Verify the MatchMakr is actually the sponsor of this Single
      const { data: sponsoredSingle, error: verificationError } = await supabaseAdmin
        .from('profiles')
        .select('id, sponsored_by_id')
        .eq('id', single_id)
        .eq('sponsored_by_id', user.id)
        .single();
      
      if (verificationError || !sponsoredSingle) {
        throw new Error('You are not the sponsor of this Single or the Single was not found.');
      }
      
      targetSingleId = single_id;
      sponsorId = user.id;
    } else {
      throw new Error('Only SINGLE or MATCHMAKR users can end a sponsorship.');
    }

    // Cancel ACCEPTED sponsorship_requests for this pair (get invite_ids for linked invites)
    const { data: cancelledRequests, error: cancelRequestsError } = await supabaseAdmin
      .from('sponsorship_requests')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('sponsor_id', sponsorId)
      .eq('single_id', targetSingleId)
      .eq('status', 'ACCEPTED')
      .select('invite_id');

    if (cancelRequestsError) {
      console.error('Error cancelling sponsorship requests:', cancelRequestsError);
      // Continue - clearing profile is primary
    }

    // Cancel linked invites
    const inviteIds = (cancelledRequests ?? [])
      .map((r: { invite_id: string | null }) => r.invite_id)
      .filter((id): id is string => id != null);

    if (inviteIds.length > 0) {
      const { error: cancelInvitesError } = await supabaseAdmin
        .from('invites')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .in('id', inviteIds);
      if (cancelInvitesError) {
        console.error('Error cancelling linked invites:', cancelInvitesError);
      }
    } else {
      // Fallback: cancel invites by pair (covers sponsor→single and single→sponsor)
      // Include ACCEPTED and CLAIMED for self-healing if invite wasn't updated to ACCEPTED
      const { error: cancelInvitesFallbackError } = await supabaseAdmin
        .from('invites')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .in('status', ['ACCEPTED', 'CLAIMED'])
        .or(`and(inviter_id.eq.${sponsorId},invitee_user_id.eq.${targetSingleId}),and(inviter_id.eq.${targetSingleId},invitee_user_id.eq.${sponsorId})`);
      if (cancelInvitesFallbackError) {
        console.error('Error cancelling invites (fallback):', cancelInvitesFallbackError);
      }
    }

    // Decouple the relationship by setting sponsored_by_id to null
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ sponsored_by_id: null })
      .eq('id', targetSingleId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Could not end the sponsorship.');
    }

    // Delete direct messages between the sponsor and single (use sponsorId, not user.id)
    // When SINGLE calls, user.id = single; when MATCHMAKR calls, user.id = sponsor. Use sponsorId + targetSingleId for both.
    const { error: deleteMessagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${sponsorId},recipient_id.eq.${targetSingleId}),and(sender_id.eq.${targetSingleId},recipient_id.eq.${sponsorId})`);

    if (deleteMessagesError) {
      console.error('Error deleting messages:', deleteMessagesError);
      // Don't throw error here - sponsorship ending is more important than message cleanup
    }

    // Delete conversation records between the sponsor and single (use sponsorId, not user.id)
    const { error: deleteConversationsError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .or(`and(initiator_matchmakr_id.eq.${sponsorId},about_single_id.eq.${targetSingleId}),and(recipient_matchmakr_id.eq.${sponsorId},about_single_id.eq.${targetSingleId})`);

    if (deleteConversationsError) {
      console.error('Error deleting conversations:', deleteConversationsError);
      // Don't throw error here - sponsorship ending is more important than conversation cleanup
    }

    return new Response(JSON.stringify({ message: 'Sponsorship ended successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 