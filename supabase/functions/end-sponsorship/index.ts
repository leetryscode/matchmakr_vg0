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

    if (callingUserProfile.user_type === 'SINGLE') {
      // If a Single calls this, they are ending their own sponsorship.
      targetSingleId = user.id;
    } else if (callingUserProfile.user_type === 'MATCHMAKR') {
      // If a MatchMakr calls this, they must specify which single to release.
      if (!single_id) {
        throw new Error('MatchMakr must provide the ID of the single to release.');
      }

      // Verify the MatchMakr is actually the sponsor of this Single
      const { data: sponsoredSingle, error: verificationError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', single_id)
        .eq('sponsored_by_id', user.id)
        .single();
      
      if (verificationError || !sponsoredSingle) {
        throw new Error('You are not the sponsor of this Single or the Single was not found.');
      }
      
      targetSingleId = single_id;
    } else {
      throw new Error('Only SINGLE or MATCHMAKR users can end a sponsorship.');
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

    // Delete direct messages between the sponsor and single
    // This includes messages where either the sponsor or single is sender/recipient
    // Note: We preserve sponsor-sponsor conversations and messages to allow continued communication
    // We also delete conversation records to ensure a clean slate when sponsorship is re-initiated
    const { error: deleteMessagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetSingleId}),and(sender_id.eq.${targetSingleId},recipient_id.eq.${user.id})`);

    if (deleteMessagesError) {
      console.error('Error deleting messages:', deleteMessagesError);
      // Don't throw error here - sponsorship ending is more important than message cleanup
    }

    // Delete conversation records between the sponsor and single
    // This ensures a clean slate when sponsorship is re-initiated
    const { error: deleteConversationsError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .or(`and(initiator_matchmakr_id.eq.${user.id},about_single_id.eq.${targetSingleId}),and(recipient_matchmakr_id.eq.${user.id},about_single_id.eq.${targetSingleId})`);

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