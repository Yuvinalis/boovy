import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'boovy-media';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare R2 credentials are not configured yet.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { action, path, contentType, expiresIn = 3600 } = await req.json();
    const r2 = new AwsClient({ accessKeyId, secretAccessKey });
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${path}`;

    const method = action === 'upload' ? 'PUT' : action === 'delete' ? 'DELETE' : 'GET';
    const signed = await r2.sign(
      new Request(`${endpoint}?X-Amz-Expires=${expiresIn}`, {
        method,
        headers: contentType ? { 'Content-Type': contentType } : undefined,
      }),
      { aws: { signQuery: true } },
    );

    return new Response(JSON.stringify({ url: signed.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
