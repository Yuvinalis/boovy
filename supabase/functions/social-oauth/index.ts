import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, platform, code, redirectUri } = await req.json();

    if (action === 'get_auth_url') {
      if (platform === 'tiktok') {
        const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
        if (!clientKey) {
          return new Response(
            JSON.stringify({
              error: 'TIKTOK_CLIENT_KEY is not configured in Supabase Edge Function secrets.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
        url.searchParams.set('client_key', clientKey);
        url.searchParams.set('scope', 'user.info.basic,video.publish');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('state', `tiktok_${user.id}`);
        return new Response(JSON.stringify({ url: url.toString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (platform === 'facebook') {
        const appId = Deno.env.get('META_APP_ID');
        if (!appId) {
          return new Response(
            JSON.stringify({
              error: 'META_APP_ID is not configured in Supabase Edge Function secrets.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
        url.searchParams.set('client_id', appId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('scope', 'pages_manage_posts,pages_read_engagement,publish_video');
        url.searchParams.set('state', `facebook_${user.id}`);
        return new Response(JSON.stringify({ url: url.toString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'exchange_code') {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      if (platform === 'tiktok') {
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: Deno.env.get('TIKTOK_CLIENT_KEY') ?? '',
            client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '',
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        const tokenData = await res.json();
        if (!res.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || 'TikTok token exchange failed');
        }

        const { data: conn, error } = await adminClient
          .from('social_connections')
          .upsert(
            {
              user_id: user.id,
              platform: 'tiktok',
              platform_account_id: tokenData.open_id,
              account_name: `TikTok (${String(tokenData.open_id).slice(0, 8)})`,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token ?? null,
              expires_at: new Date(Date.now() + (tokenData.expires_in ?? 86400) * 1000).toISOString(),
            },
            { onConflict: 'user_id,platform,platform_account_id' },
          )
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ connection: conn }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (platform === 'facebook') {
        const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', Deno.env.get('META_APP_ID') ?? '');
        tokenUrl.searchParams.set('client_secret', Deno.env.get('META_APP_SECRET') ?? '');
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        tokenUrl.searchParams.set('code', code);

        const res = await fetch(tokenUrl.toString());
        const tokenData = await res.json();
        if (!res.ok || !tokenData.access_token) {
          throw new Error(tokenData.error?.message || 'Facebook token exchange failed');
        }

        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${tokenData.access_token}`,
        );
        const me = await meRes.json();

        const { data: conn, error } = await adminClient
          .from('social_connections')
          .upsert(
            {
              user_id: user.id,
              platform: 'facebook',
              platform_account_id: me.id,
              account_name: me.name || 'Facebook Account',
              access_token: tokenData.access_token,
              expires_at: tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
                : null,
            },
            { onConflict: 'user_id,platform,platform_account_id' },
          )
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ connection: conn }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unsupported action or platform' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
