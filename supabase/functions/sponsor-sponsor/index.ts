// Sponsor invites another person to join Orbit as a Sponsor (JOIN invite).
// Creates PENDING invite, generates token, sends Resend email with /invite/:token link.

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

console.log(`Function "sponsor-sponsor" up and running!`);

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
    const { invitee_email, invitee_label } = await req.json();

    const normalizedEmail = (invitee_email || '').trim().toLowerCase();
    const normalizedInviteeLabel = typeof invitee_label === 'string' && invitee_label.trim()
      ? invitee_label.trim()
      : null;

    if (!normalizedEmail) {
      return jsonResponse({ error: 'Email is required.', code: 'INVALID_INPUT' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return jsonResponse({ error: 'Please enter a valid email address.', code: 'INVALID_EMAIL' }, 400);
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
    if (!user) {
      return jsonResponse({ error: 'Not authenticated.', code: 'AUTH_ERROR' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type, name, orbit_community_slug')
      .eq('id', user.id)
      .single();

    if (profileError || !inviterProfile) {
      return jsonResponse({ error: 'Could not find your profile.', code: 'PROFILE_NOT_FOUND' }, 404);
    }

    if (inviterProfile.user_type !== 'MATCHMAKR') {
      return jsonResponse({ error: 'You must be a Sponsor to invite another Sponsor.', code: 'INVALID_USER_TYPE' }, 400);
    }

    // Dedupe: if PENDING invite already exists for (inviter_id, invitee_email) with target MATCHMAKR
    const { data: existingInvite } = await supabaseAdmin
      .from('invites')
      .select('id, status')
      .eq('inviter_id', user.id)
      .eq('invitee_email', normalizedEmail)
      .eq('target_user_type', 'MATCHMAKR')
      .eq('status', 'PENDING')
      .limit(1)
      .maybeSingle();

    if (existingInvite) {
      return jsonResponse({
        message: 'Invite already pending for this email.',
        invite_id: existingInvite.id,
        status: 'already_pending',
      }, 200);
    }

    // Create PENDING invite
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
          target_user_type: 'MATCHMAKR',
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
    const templateId = Deno.env.get('RESEND_TEMPLATE_SPONSOR_TO_SPONSOR');
    if (siteUrl && templateId) {
      const inviteLink = `${siteUrl}/invite/${invite.token}`;
      const inviteeName = normalizedInviteeLabel?.trim() ? normalizedInviteeLabel.trim() : 'there';
      try {
        emailSent = await sendResendTemplateEmail({
          to: normalizedEmail,
          templateId,
          invitorName: inviterProfile.name || 'Someone',
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
      ok: true,
      invite_id: invite.id,
      token: invite.token,
      email_sent: emailSent,
      message: 'Invite saved. They will need to create an Orbit account to accept.',
    }, 200);
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
