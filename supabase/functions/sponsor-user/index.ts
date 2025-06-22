// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define CORS headers directly in the function file for debugging
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log(`Function "sponsor-user" up and running!`);

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { matchmakr_email } = await req.json();

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the current user from the token
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;

    // Create a Supabase admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find the matchmaker's user by their email using the admin API
    const { data: { users: matchmakrUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      email: matchmakr_email,
    });

    if (listError) throw listError;
    
    if (!matchmakrUsers || matchmakrUsers.length === 0) {
      return new Response(JSON.stringify({ error: 'MatchMakr not found with that email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const matchmakrUser = matchmakrUsers[0];
    const matchmakrId = matchmakrUser.id;

    // 2. Check if the found user is actually a 'MATCHMAKR'
    const { data: matchmakrProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
      .eq('id', matchmakrId)
      .single();

    if (profileError || !matchmakrProfile) {
      return new Response(JSON.stringify({ error: 'Could not find a profile for the specified MatchMakr.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (matchmakrProfile.user_type !== 'MATCHMAKR') {
      return new Response(JSON.stringify({ error: 'This user is not a MatchMakr.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Update the single user's profile with the sponsor's ID
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ sponsored_by_id: matchmakrId })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update Error:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ message: 'Successfully sponsored by MatchMakr!' }), {
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sponsor-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
