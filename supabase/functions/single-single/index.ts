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

console.log(`Function "single-single" up and running!`);

// Single → Single referral invite: always send email, no lookup, no DB writes.
// CTA drops invitee on app entry page (Get started / Log in).

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

    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type, name')
      .eq('id', user.id)
      .single();

    if (profileError || !inviterProfile) {
      return jsonResponse({ error: 'Could not find your profile.', code: 'PROFILE_NOT_FOUND' }, 404);
    }

    if (inviterProfile.user_type !== 'SINGLE') {
      return jsonResponse(
        { error: 'You must be a Single to invite another Single.', code: 'INVALID_USER_TYPE' },
        400
      );
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    const templateId = Deno.env.get('RESEND_TEMPLATE_SINGLE_TO_SINGLE');
    const invitorName = inviterProfile.name?.trim() || 'Someone';
    const inviteeName =
      typeof invitee_label === 'string' && invitee_label.trim()
        ? invitee_label.trim()
        : 'there';
    const inviteLink = `${siteUrl}/`;

    let emailSent = false;
    if (templateId) {
      try {
        emailSent = await sendResendTemplateEmail({
          to: normalizedEmail,
          templateId,
          invitorName,
          inviteeName,
          inviteLink,
        });
        if (emailSent) {
          console.log('single_single_send_ok', { to: normalizedEmail });
        } else {
          console.error('single_single_send_failed', { to: normalizedEmail, error: 'send returned false' });
        }
      } catch (err) {
        console.error('single_single_send_failed', { to: normalizedEmail, error: String(err) });
      }
    }

    if (emailSent) {
      return jsonResponse({
        status: 'sent',
        message: 'Invite sent.',
        email_sent: true,
      }, 200);
    }

    return jsonResponse({
      status: 'sent',
      message: 'Invite attempted, but email failed to send.',
      email_sent: false,
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
