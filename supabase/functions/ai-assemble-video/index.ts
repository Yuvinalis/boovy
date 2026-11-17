import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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

    const {
      prompt,
      referenceUrl,
      aspectRatio = '9:16',
      model = 'google/gemini-2.0-flash-001',
    } = await req.json();

    // Fetch user + shared tagged assets to give OpenRouter real catalog items
    const { data: assets } = await userClient.rpc('search_boovy_assets', {
      search_query: '',
      filter_tags: [],
      filter_kind: null,
    });

    const catalog = (assets ?? []).slice(0, 30).map((a: Record<string, unknown>) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      description: a.description,
      tags: a.tag_names,
      duration_ms: a.duration_ms ?? 4000,
    }));

    const resolution = RESOLUTION_MAP[aspectRatio] ?? RESOLUTION_MAP['9:16'];
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    let generatedTimeline: Record<string, unknown> | null = null;
    let projectTitle = `AI: ${String(prompt).slice(0, 32)}`;

    if (openRouterKey) {
      const systemPrompt = `You are Boovy AI, a video editor assistant. Return ONLY valid JSON (no markdown) matching:
{
  "title": "short project title",
  "textOverlays": [{ "text": "hook or caption", "startMs": 0, "durationMs": 3000 }],
  "selectedAssetIds": ["uuid1", "uuid2"],
  "transition": "fade" | "slide-left" | "zoom-in"
}`;

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://boovy-app.web.app',
          'X-Title': 'Boovy Video Studio',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: JSON.stringify({ prompt, referenceUrl, aspectRatio, catalog }),
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (orRes.ok) {
        const orJson = await orRes.json();
        const content = orJson.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.title) projectTitle = parsed.title;

          const selectedAssets = catalog.filter((c: { id: string }) =>
            (parsed.selectedAssetIds ?? []).includes(c.id),
          );

          const videoClips: unknown[] = [];
          let cursorMs = 0;
          for (const item of selectedAssets) {
            const dur = Number(item.duration_ms) || 4000;
            videoClips.push({
              id: `ai_clip_${crypto.randomUUID().slice(0, 8)}`,
              assetId: item.id,
              name: item.title,
              type: item.kind === 'meme' ? 'meme' : 'video',
              startMs: cursorMs,
              durationMs: dur,
              sourceStartMs: 0,
              speed: 1,
              volume: 1,
              blendMode: 'source-over',
              keyframes: {
                x: [{ id: 'kf_x', timeMs: 0, value: 0, easing: 'ease-out' }],
                y: [{ id: 'kf_y', timeMs: 0, value: 0, easing: 'ease-out' }],
                scale: [{ id: 'kf_s', timeMs: 0, value: 1, easing: 'ease-out' }],
                rotation: [{ id: 'kf_r', timeMs: 0, value: 0, easing: 'ease-out' }],
                opacity: [{ id: 'kf_o', timeMs: 0, value: 1, easing: 'ease-out' }],
              },
              filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0 },
              transitionIn: { type: parsed.transition ?? 'fade', durationMs: 400 },
              transitionOut: { type: 'none', durationMs: 400 },
            });
            cursorMs += dur;
          }

          const textClips = (parsed.textOverlays ?? []).map(
            (t: { text: string; startMs: number; durationMs: number }) => ({
              id: `ai_txt_${crypto.randomUUID().slice(0, 8)}`,
              name: String(t.text).slice(0, 18),
              type: 'text',
              startMs: t.startMs ?? 0,
              durationMs: t.durationMs ?? 3000,
              sourceStartMs: 0,
              speed: 1,
              volume: 1,
              blendMode: 'source-over',
              keyframes: {
                x: [{ id: 'kf_x', timeMs: 0, value: 0, easing: 'ease-out' }],
                y: [{ id: 'kf_y', timeMs: 0, value: -180, easing: 'ease-out' }],
                scale: [{ id: 'kf_s', timeMs: 0, value: 1, easing: 'ease-out' }],
                rotation: [{ id: 'kf_r', timeMs: 0, value: 0, easing: 'ease-out' }],
                opacity: [{ id: 'kf_o', timeMs: 0, value: 1, easing: 'ease-out' }],
              },
              filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0 },
              transitionIn: { type: 'zoom-in', durationMs: 350 },
              transitionOut: { type: 'fade', durationMs: 300 },
              textStyle: {
                text: t.text,
                fontSize: 56,
                fontFamily: 'Inter, sans-serif',
                color: '#FFFFFF',
                backgroundColor: '#000000B0',
                fontWeight: '700',
                align: 'center',
              },
            }),
          );

          generatedTimeline = {
            version: 1,
            fps: 30,
            resolution,
            durationMs: Math.max(10000, cursorMs),
            tracks: [
              { id: 'trk_text', type: 'text', name: 'Text & Captions', muted: false, locked: false, visible: true, clips: textClips },
              { id: 'trk_overlay', type: 'overlay', name: 'Memes & Overlays', muted: false, locked: false, visible: true, clips: [] },
              { id: 'trk_video', type: 'video', name: 'Main Video', muted: false, locked: false, visible: true, clips: videoClips },
              { id: 'trk_audio', type: 'audio', name: 'Audio & SFX', muted: false, locked: false, visible: true, clips: [] },
            ],
          };
        }
      }
    }

    if (!generatedTimeline) {
      return new Response(
        JSON.stringify({
          error: 'OPENROUTER_API_KEY is not configured in Supabase Edge Function secrets.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: project, error: projErr } = await userClient
      .from('projects')
      .insert({
        user_id: user.id,
        title: projectTitle,
        aspect_ratio: aspectRatio,
        timeline_data: generatedTimeline,
      })
      .select()
      .single();

    if (projErr) throw projErr;

    await userClient.from('ai_generations').insert({
      user_id: user.id,
      project_id: project.id,
      prompt,
      reference_url: referenceUrl || null,
      model,
      status: 'completed',
    });

    return new Response(JSON.stringify({ project }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
