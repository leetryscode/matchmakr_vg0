// Single invites sponsor: CONNECT (sponsor exists) or JOIN (sponsor does not exist).
// CONNECT: CLAIMED invite + sponsorship_request + in-app notification + CONNECT email (link to dashboard).
// JOIN: PENDING invite + token + JOIN email (link to /invite/:token).
// sponsorship_request is created by handle_new_user when sponsor signs up via invite.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Generate a URL-safe token for invite links (12 chars alphanumeric) */
function generateInviteToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

/** Send Resend transactional template email (non-blocking; logs on failure). Uses INVITE_LINK for all templates. */
async function sendResendTemplateEmail(params: {
  to: string;
  templateId: string;
  invitorName: string;
  inviteeName: string;
  inviteLink: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM');
  if (!apiKey || !from) return false;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      template: {
        id: params.templateId,
        variables: {
          INVITOR_NAME: params.invitorName,
          INVITEE_NAME: params.inviteeName,
          INVITE_LINK: params.inviteLink,
        },
      },
    }),
  });

  return res.ok;
}

console.log(`Function "sponsor-user" up and running!`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonResponse = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });

  try {
    const { matchmakr_email, invitee_label } = await req.json();
    const normalizedEmail = (matchmakr_email ?? '').trim().toLowerCase();
    const normalizedInviteeLabel = typeof invitee_label === 'string' && invitee_label.trim()
      ? invitee_label.trim()
      : null;
    if (!normalizedEmail) {
      return jsonResponse({ error: 'Email is required.' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Verify current user is a SINGLE
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type, name')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile) {
      return jsonResponse({ error: 'Could not find your profile.' }, 404);
    }

    if (callerProfile.user_type !== 'SINGLE') {
      return jsonResponse({ error: 'Only singles can invite a sponsor.' }, 400);
    }

    const singleId = callerProfile.id;
    const singleName = callerProfile.name ?? 'Someone';

    // 2) Find sponsor by email
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const matchmakrUser = allUsers.find(
      (u) => (u.email ?? '').trim().toLowerCase() === normalizedEmail
    );

    if (matchmakrUser) {
      // --- CONNECT path: sponsor exists ---
      const sponsorId = matchmakrUser.id;

      const { data: sponsorProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, user_type')
        .eq('id', sponsorId)
        .single();

      if (profileError || !sponsorProfile) {
        return jsonResponse({ error: 'Could not find a profile for the specified MatchMakr.' }, 404);
      }

      if (sponsorProfile.user_type !== 'MATCHMAKR') {
        return jsonResponse({ error: 'This user is not a MatchMakr.' }, 400);
      }

      // Create CLAIMED invite (no token for CONNECT)
      let invite: { id: string } | null = null;
      const { data: inviteData, error: inviteError } = await supabaseAdmin
        .from('invites')
        .insert({
          inviter_id: singleId,
          invitee_email: normalizedEmail,
          invitee_phone_e164: null,
          invitee_user_id: sponsorId,
          invitee_label: normalizedInviteeLabel,
          target_user_type: 'MATCHMAKR',
          status: 'CLAIMED',
          token: null,
        })
        .select('id')
        .single();

      if (inviteError) {
        console.error('Invite insert error:', inviteError);
        return jsonResponse({ error: 'Failed to create invite.' }, 500);
      }
      invite = inviteData;

      // Create sponsorship_request
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

      if (requestError && requestError.code !== 'PGRST116') {
        console.error('Sponsorship request insert error:', requestError);
        return jsonResponse({ error: 'Failed to create sponsorship request.' }, 500);
      }

      const requestId = request?.id ?? null;

      // In-app notification
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

      // Send CONNECT email: INVITE_LINK = dashboard (no token)
      let emailSent = false;
      const siteUrl = Deno.env.get('SITE_URL') ?? '';
      const templateId = Deno.env.get('RESEND_TEMPLATE_SINGLE_TO_SPONSOR_CONNECT');
      const inviteLink = siteUrl ? `${siteUrl}/dashboard` : '';
      const inviteeName = sponsorProfile.name?.trim() || 'there';

      if (siteUrl && templateId) {
        try {
          emailSent = await sendResendTemplateEmail({
            to: normalizedEmail,
            templateId,
            invitorName: singleName,
            inviteeName,
            inviteLink,
          });
          if (emailSent) {
            console.log('resend_send_ok', { invite_id: invite.id, to: normalizedEmail, mode: 'connect' });
          } else {
            console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, mode: 'connect' });
          }
        } catch (err) {
          console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: String(err) });
        }
      }

      return jsonResponse({
        ok: true,
        mode: 'connect',
        email_sent: emailSent,
        message: 'Request sent! The MatchMakr will need to approve before you can connect.',
      }, 200);
    }

    // --- JOIN path: sponsor does not exist ---

    // Dedupe: same single + same email + PENDING
    const { data: existingInvite } = await supabaseAdmin
      .from('invites')
      .select('id, status')
      .eq('inviter_id', singleId)
      .eq('invitee_email', normalizedEmail)
      .eq('target_user_type', 'MATCHMAKR')
      .eq('status', 'PENDING')
      .limit(1)
      .maybeSingle();

    if (existingInvite) {
      return jsonResponse({
        ok: true,
        mode: 'join',
        already_pending: true,
        message: 'Invite already pending for this email.',
      }, 200);
    }

    // Create PENDING invite with token
    let invite: { id: string; token: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateInviteToken();
      const { data, error: inviteError } = await supabaseAdmin
        .from('invites')
        .insert({
          inviter_id: singleId,
          invitee_email: normalizedEmail,
          invitee_phone_e164: null,
          invitee_user_id: null,
          invitee_label: normalizedInviteeLabel,
          target_user_type: 'MATCHMAKR',
          status: 'PENDING',
          token,
        })
        .select('id, token')
        .single();

      if (!inviteError) {
        invite = data;
        break;
      }
      if (inviteError.code === '23505') continue; // unique_violation, retry with new token
      console.error('Invite insert error:', inviteError);
      return jsonResponse({ error: 'Failed to create invite.' }, 500);
    }

    if (!invite) {
      return jsonResponse({ error: 'Failed to create invite (token collision).' }, 500);
    }

    // Send JOIN email: INVITE_LINK = /invite/:token
    let emailSent = false;
    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    const templateId = Deno.env.get('RESEND_TEMPLATE_SPONSOR_TO_SPONSOR');
    const inviteLink = siteUrl ? `${siteUrl}/invite/${invite.token}` : '';
    const inviteeName = normalizedInviteeLabel || 'there';

    if (siteUrl && templateId) {
      try {
        emailSent = await sendResendTemplateEmail({
          to: normalizedEmail,
          templateId,
          invitorName: singleName,
          inviteeName,
          inviteLink,
        });
        if (emailSent) {
          console.log('resend_send_ok', { invite_id: invite.id, to: normalizedEmail, mode: 'join' });
        } else {
          console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, mode: 'join' });
        }
      } catch (err) {
        console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: String(err) });
      }
    }

    return jsonResponse({
      ok: true,
      mode: 'join',
      token: invite.token,
      email_sent: emailSent,
      message: 'Invite sent! They will need to create an Orbit account to accept.',
    }, 200);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
