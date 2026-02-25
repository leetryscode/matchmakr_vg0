import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

console.log(`Function "delete-account" up and running!`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) {
      return jsonResponse({ error: userError.message }, 401);
    }
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) RPC: delete profile and related data
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('delete_user_data', {
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error('delete_user_data RPC error:', rpcError);
      return jsonResponse({ error: rpcError.message }, 500);
    }

    if (rpcData?.deleted !== true) {
      console.error('delete_user_data returned deleted !== true:', rpcData);
      return jsonResponse({ error: 'Account data could not be deleted' }, 500);
    }

    // 2) Delete auth user (irreversible step)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('auth.admin.deleteUser error:', authDeleteError);
      return jsonResponse({ error: authDeleteError.message }, 500);
    }

    // 3) Storage delete (best effort) - do not abort on failure
    try {
      const { data: fileList } = await supabaseAdmin.storage
        .from('profile_pictures')
        .list(user.id, { limit: 1000 });

      if (fileList && fileList.length > 0) {
        const paths = fileList.map((f) => `${user.id}/${f.name}`);
        const { error: removeError } = await supabaseAdmin.storage
          .from('profile_pictures')
          .remove(paths);
        if (removeError) {
          console.error('Storage remove error (best effort, continuing):', removeError);
        }
      }
    } catch (storageErr) {
      console.error('Storage delete failed (best effort, continuing):', storageErr);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error('delete-account error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});
