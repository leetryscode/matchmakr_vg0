// Single invites sponsor: creates invite + sponsorship_request (PENDING_SPONSOR_APPROVAL).
// Does NOT set profiles.sponsored_by_id. Sponsor must accept via accept_sponsorship_request_as_sponsor RPC.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log(`Function "sponsor-user" up and running!`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { matchmakr_email } = await req.json();
    const normalizedEmail = (matchmakr_email ?? '').trim().toLowerCase();
    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Verify current user is a SINGLE
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Could not find your profile.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (callerProfile.user_type !== 'SINGLE') {
      return new Response(JSON.stringify({ error: 'Only singles can invite a sponsor.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const singleId = callerProfile.id;

    // 2) Find sponsor by email (must be MATCHMAKR)
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const matchmakrUser = allUsers.find(
      (u) => (u.email ?? '').trim().toLowerCase() === normalizedEmail
    );

    if (!matchmakrUser) {
      return new Response(JSON.stringify({ error: 'MatchMakr not found with that email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const sponsorId = matchmakrUser.id;

    const { data: sponsorProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, user_type')
      .eq('id', sponsorId)
      .single();

    if (profileError || !sponsorProfile) {
      return new Response(JSON.stringify({ error: 'Could not find a profile for the specified MatchMakr.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (sponsorProfile.user_type !== 'MATCHMAKR') {
      return new Response(JSON.stringify({ error: 'This user is not a MatchMakr.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3) Create invite: inviter_id=single, invitee_email=sponsor email, invitee_user_id=sponsor, status=CLAIMED
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .insert({
        inviter_id: singleId,
        invitee_email: normalizedEmail,
        invitee_phone_e164: null,
        invitee_user_id: sponsorId,
        target_user_type: 'MATCHMAKR',
        status: 'CLAIMED',
      })
      .select('id')
      .single();

    if (inviteError) {
      console.error('Invite insert error:', inviteError);
      return new Response(JSON.stringify({ error: 'Failed to create invite.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 4) Create sponsorship_request: ON CONFLICT (sponsor_id, single_id) DO NOTHING
    const { data: request, error: requestError } = await supabaseAdmin
      .from('sponsorship_requests')
      .upsert(
        {
          sponsor_id: sponsorId,
          single_id: singleId,
          invite_id: invite.id,
          status: 'PENDING_SPONSOR_APPROVAL',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'sponsor_id,single_id',
          ignoreDuplicates: true,
        }
      )
      .select('id')
      .single();

    // If conflict (already exists), we may get no row; that's ok - return success
    if (requestError && requestError.code !== 'PGRST116') {
      console.error('Sponsorship request insert error:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to create sponsorship request.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const requestId = request?.id ?? null;

    // 5) Create notification for sponsor
    const singleName = (await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', singleId)
      .single()).data?.name ?? 'Someone';

    if (requestId) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: sponsorId,
          type: 'sponsorship_request',
          data: {
            request_id: requestId,
            single_id: singleId,
            single_name: singleName,
          },
          read: false,
          dismissed_at: null,
        });
    }

    return new Response(JSON.stringify({
      message: 'Invite sent! The MatchMakr will need to approve before you can connect.',
    }), {
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
