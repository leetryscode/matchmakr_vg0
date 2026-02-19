// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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

/** Send Resend transactional template email (non-blocking; logs on failure) */
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

console.log(`Function "sponsor-single" up and running!`);

// Creates invites + sponsorship_requests. Does NOT set profiles.sponsored_by_id.
// Single must approve before link is established.

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
    const { single_email, sponsor_label, invitee_label } = await req.json();

    const normalizedEmail = (single_email || '').trim().toLowerCase();
    const normalizedInviteeLabel = typeof invitee_label === 'string' && invitee_label.trim()
      ? invitee_label.trim()
      : null;
    if (!normalizedEmail) {
      return jsonResponse({ error: 'Email is required.', code: 'INVALID_INPUT' }, 400);
    }

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) {
      return jsonResponse({ error: 'Authentication failed.', code: 'AUTH_ERROR' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: matchmakrProfile, error: matchmakrProfileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type, name')
      .eq('id', user.id)
      .single();

    if (matchmakrProfileError || !matchmakrProfile) {
      return jsonResponse({ error: 'Could not find your profile.', code: 'PROFILE_NOT_FOUND' }, 404);
    }

    if (matchmakrProfile.user_type !== 'MATCHMAKR') {
      return jsonResponse({ error: 'You must be a MatchMakr to sponsor a Single.', code: 'INVALID_USER_TYPE' }, 400);
    }

    // Look up existing user by email
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return jsonResponse({ error: 'Failed to search for user.', code: 'SEARCH_ERROR' }, 500);
    }

    const singleUser = allUsers.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);
    const singleId = singleUser?.id ?? null;

    // 1) User exists but not SINGLE: return 400, do not create invite
    if (singleId) {
      const { data: singleProfile, error: singleProfileError } = await supabaseAdmin
        .from('profiles')
        .select('user_type')
        .eq('id', singleId)
        .single();

      if (!singleProfileError && singleProfile && singleProfile.user_type !== 'SINGLE') {
        const role = singleProfile.user_type === 'MATCHMAKR' ? 'Sponsor' : 'Vendor';
        return jsonResponse({
          error: `That email belongs to a ${role}. You can only invite Singles here.`,
          code: 'INVALID_TARGET_USER_TYPE',
        }, 400);
      }
    }

    // 2) Dedupe invites: reuse if active invite exists for (inviter_id, invitee_email)
    const { data: existingInvite } = await supabaseAdmin
      .from('invites')
      .select('id, status, invitee_user_id')
      .eq('inviter_id', user.id)
      .eq('invitee_email', normalizedEmail)
      .in('status', ['PENDING', 'CLAIMED'])
      .limit(1)
      .maybeSingle();

    if (existingInvite) {
      if (existingInvite.status === 'PENDING') {
        return jsonResponse({
          message: 'Invite already pending for this email.',
          invite_id: existingInvite.id,
          status: 'already_pending',
        }, 200);
      }

      // CLAIMED: check sponsorship_request
      const singleIdFromInvite = existingInvite.invitee_user_id;
      if (singleIdFromInvite) {
        const { data: existingRequest } = await supabaseAdmin
          .from('sponsorship_requests')
          .select('id, status')
          .eq('sponsor_id', user.id)
          .eq('single_id', singleIdFromInvite)
          .maybeSingle();

        if (existingRequest) {
          const status = existingRequest.status === 'ACCEPTED' ? 'already_sponsoring' : 'already_requested';
          return jsonResponse({
            message: existingRequest.status === 'ACCEPTED'
              ? 'You are already sponsoring this person.'
              : 'You already have a pending request for this person.',
            invite_id: existingInvite.id,
            request_id: existingRequest.id,
            status,
          }, 200);
        }
      }
    }

    // 3) Create invite and optionally sponsorship_request
    if (singleId) {
      // User exists and is SINGLE: create sponsorship_request first, then invite
      const { data: request, error: requestError } = await supabaseAdmin
        .from('sponsorship_requests')
        .insert({
          sponsor_id: user.id,
          single_id: singleId,
          invite_id: null,
          status: 'PENDING_SINGLE_APPROVAL',
        })
        .select('id')
        .single();

      if (requestError) {
        if (requestError.code === '23505') {
          const { data: dupRequest } = await supabaseAdmin
            .from('sponsorship_requests')
            .select('id, status, invite_id')
            .eq('sponsor_id', user.id)
            .eq('single_id', singleId)
            .single();
          const status = dupRequest?.status === 'ACCEPTED' ? 'already_sponsoring' : 'already_requested';
          return jsonResponse({
            message: dupRequest?.status === 'ACCEPTED'
              ? 'You are already sponsoring this person.'
              : 'You already have a pending request for this person.',
            invite_id: dupRequest?.invite_id ?? undefined,
            request_id: dupRequest?.id,
            status,
          }, 200);
        }
        console.error('Sponsorship request insert error:', requestError);
        return jsonResponse({ error: 'Failed to create sponsorship request.', code: 'REQUEST_ERROR' }, 500);
      }

      let invite: { id: string; token: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error: inviteError } = await supabaseAdmin
          .from('invites')
          .insert({
            inviter_id: user.id,
            invitee_email: normalizedEmail,
            invitee_phone_e164: null,
            invitee_user_id: singleId,
            invitee_label: normalizedInviteeLabel,
            target_user_type: 'SINGLE',
            status: 'CLAIMED',
            token: generateInviteToken(),
          })
          .select('id, token')
          .single();

        if (!inviteError) {
          invite = data;
          break;
        }
        if (inviteError.code === '23505') continue; // unique_violation, retry with new token
        console.error('Invite insert error:', inviteError);
        return jsonResponse({ error: 'Failed to create invite.', code: 'INVITE_ERROR' }, 500);
      }
      if (!invite) {
        return jsonResponse({ error: 'Failed to create invite (token collision).', code: 'INVITE_ERROR' }, 500);
      }

      // Send Resend template email (non-blocking)
      let emailSent = false;
      const siteUrl = Deno.env.get('SITE_URL') ?? '';
      const templateId = Deno.env.get('RESEND_TEMPLATE_SPONSOR_TO_SINGLE');
      if (siteUrl && templateId) {
        const inviteLink = `${siteUrl}/invite/${invite.token}`;
        const inviteeName = normalizedInviteeLabel?.trim() ? normalizedInviteeLabel.trim() : 'there';
        try {
          emailSent = await sendResendTemplateEmail({
            to: normalizedEmail,
            templateId,
            invitorName: matchmakrProfile.name || 'Someone',
            inviteeName,
            inviteLink,
          });
          if (emailSent) {
            console.log('resend_send_ok', { invite_id: invite.id, to: normalizedEmail });
          } else {
            console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: 'send returned false' });
          }
        } catch (err) {
          console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: String(err) });
        }
      }

      await supabaseAdmin
        .from('sponsorship_requests')
        .update({ invite_id: invite.id, updated_at: new Date().toISOString() })
        .eq('id', request.id);

      // 4) Notification only on new request (we just inserted)
      const sponsorName = matchmakrProfile.name || 'Someone';
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: singleId,
          type: 'sponsorship_request',
          data: {
            request_id: request.id,
            sponsor_id: user.id,
            sponsor_name: sponsorName,
            sponsor_label: sponsor_label?.trim() || null,
          },
          read: false,
          dismissed_at: null,
        });
      if (notifError) console.error('Notification insert error (non-fatal):', notifError);

      return jsonResponse({
        message: 'Invite sent! They need to approve before you can manage their profile.',
        invite_id: invite.id,
        request_id: request.id,
        status: 'request_sent',
        email_sent: emailSent,
      }, 200);
    }

    // User does not exist: create PENDING invite
    let invite: { id: string; token: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error: inviteError } = await supabaseAdmin
        .from('invites')
        .insert({
          inviter_id: user.id,
          invitee_email: normalizedEmail,
          invitee_phone_e164: null,
          invitee_user_id: null,
          invitee_label: normalizedInviteeLabel,
          target_user_type: 'SINGLE',
          status: 'PENDING',
          token: generateInviteToken(),
        })
        .select('id, token')
        .single();

      if (!inviteError) {
        invite = data;
        break;
      }
      if (inviteError.code === '23505') continue; // unique_violation, retry with new token
      console.error('Invite insert error:', inviteError);
      return jsonResponse({ error: 'Failed to create invite.', code: 'INVITE_ERROR' }, 500);
    }
    if (!invite) {
      return jsonResponse({ error: 'Failed to create invite (token collision).', code: 'INVITE_ERROR' }, 500);
    }

    // Send Resend template email (non-blocking)
    let emailSent = false;
    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    const templateId = Deno.env.get('RESEND_TEMPLATE_SPONSOR_TO_SINGLE');
    if (siteUrl && templateId) {
      const inviteLink = `${siteUrl}/invite/${invite.token}`;
      const inviteeName = normalizedInviteeLabel?.trim() ? normalizedInviteeLabel.trim() : 'there';
      try {
        emailSent = await sendResendTemplateEmail({
          to: normalizedEmail,
          templateId,
          invitorName: matchmakrProfile.name || 'Someone',
          inviteeName,
          inviteLink,
        });
        if (emailSent) {
          console.log('resend_send_ok', { invite_id: invite.id, to: normalizedEmail });
        } else {
          console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: 'send returned false' });
        }
      } catch (err) {
        console.error('resend_send_failed', { invite_id: invite.id, to: normalizedEmail, error: String(err) });
      }
    }

    return jsonResponse({
      message: 'Invite saved. They will need to create an Orbit account to accept.',
      invite_id: invite.id,
      status: 'pending',
      email_sent: emailSent,
    }, 200);
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
