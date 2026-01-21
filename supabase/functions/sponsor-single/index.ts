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

console.log(`Function "sponsor-single" up and running!`);

// NOTE: This function currently only links existing users. Pre-signup invites will be handled by `invites` table + acceptance flow.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { single_email, sponsor_label } = await req.json();

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the current user from the token
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed.',
        code: 'AUTH_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a Supabase admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if the current user is a MatchMakr
    const { data: matchmakrProfile, error: matchmakrProfileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (matchmakrProfileError || !matchmakrProfile) {
      return new Response(JSON.stringify({ 
        error: 'Could not find your profile.',
        code: 'PROFILE_NOT_FOUND'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (matchmakrProfile.user_type !== 'MATCHMAKR') {
      return new Response(JSON.stringify({ 
        error: 'You must be a MatchMakr to sponsor a Single.',
        code: 'INVALID_USER_TYPE'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Find the Single user by their email
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(JSON.stringify({ 
        error: 'Failed to search for user.',
        code: 'SEARCH_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Workaround for local dev where listUsers doesn't filter by email.
    // This is safe for production as well.
    const singleUser = allUsers.find(u => u.email === single_email);

    if (!singleUser) {
      return new Response(JSON.stringify({ 
        error: 'Single user not found with that email.',
        code: 'USER_NOT_FOUND'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const singleId = singleUser.id;

    console.log('Found user:', { email: single_email, id: singleId });

    // 3. Check if the found user is actually a 'SINGLE'
    const { data: singleProfile, error: singleProfileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
      .eq('id', singleId)
      .single();

    console.log('Profile lookup result:', { singleProfile, singleProfileError });

    if (singleProfileError || !singleProfile) {
      return new Response(JSON.stringify({ 
        error: 'Could not find a profile for the specified Single.',
        code: 'PROFILE_NOT_FOUND'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('User type check:', { 
      expected: 'SINGLE', 
      actual: singleProfile.user_type, 
      isMatch: singleProfile.user_type === 'SINGLE' 
    });

    if (singleProfile.user_type !== 'SINGLE') {
      return new Response(JSON.stringify({ 
        error: 'This user is not a Single.',
        code: 'INVALID_USER_TYPE'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 4. Update the single user's profile with the sponsor's ID and label
    // Always set sponsor_label when provided (display logic prefers name over sponsor_label)
    // Never overwrite profiles.name - display logic will prefer name if it exists
    const updateData: { sponsored_by_id: string; sponsor_label?: string } = {
      sponsored_by_id: user.id
    };
    
    // Set sponsor_label if provided (display logic will prefer name if it exists)
    if (sponsor_label && sponsor_label.trim() !== '') {
      updateData.sponsor_label = sponsor_label.trim();
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', singleId);

    if (updateError) {
      console.error('Update Error:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to link account.',
        code: 'UPDATE_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Successfully linked account!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
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