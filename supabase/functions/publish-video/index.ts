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

    const { jobId } = await req.json();
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: job, error: jobErr } = await admin
      .from('publish_jobs')
      .select('*, social_connections(*)')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: 'Publish job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('publish_jobs').update({ status: 'uploading' }).eq('id', job.id);

    // Create a short-lived signed URL for the exported MP4
    const { data: signed, error: signErr } = await admin.storage
      .from(job.export_bucket)
      .createSignedUrl(job.export_path, 3600);

    if (signErr || !signed?.signedUrl) {
      throw new Error('Could not generate signed URL for exported video');
    }

    const connection = job.social_connections;
    if (!connection) {
      throw new Error('No connected social account found for this job');
    }

    const fullCaption = [job.caption, ...(job.hashtags || []).map((h: string) => (h.startsWith('#') ? h : `#${h}`))]
      .filter(Boolean)
      .join(' ');

    let platformPostId = '';

    if (job.platform === 'tiktok') {
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: fullCaption.slice(0, 2200),
            privacy_level: 'SELF_ONLY',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: signed.signedUrl,
          },
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error?.code !== 'ok') {
        throw new Error(result.error?.message || 'TikTok publish failed');
      }
      platformPostId = result.data?.publish_id ?? '';
    } else if (job.platform === 'facebook') {
      const res = await fetch(
        `https://graph-video.facebook.com/v21.0/${connection.platform_account_id}/videos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: signed.signedUrl,
            description: fullCaption,
            access_token: connection.access_token,
          }),
        },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error?.message || 'Facebook publish failed');
      }
      platformPostId = result.id ?? '';
    }

    await admin
      .from('publish_jobs')
      .update({ status: 'published', platform_post_id: platformPostId })
      .eq('id', job.id);

    return new Response(JSON.stringify({ status: 'published', platformPostId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
