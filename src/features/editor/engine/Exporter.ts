import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { BoovyTimeline } from '../../../types/timeline';
import { Compositor } from './Compositor';

export interface ExportOptions {
  timeline: BoovyTimeline;
  onProgress: (percent: number, stage: string) => void;
}

/**
 * Exports a BoovyTimeline to an MP4 Blob using multi-threaded ffmpeg.wasm
 * when crossOriginIsolated (COOP/COEP) is active, or single-threaded fallback.
 */
export async function exportTimelineToMp4({ timeline, onProgress }: ExportOptions): Promise<Blob> {
  onProgress(5, 'Initializing Boovy render engine...');
  const ffmpeg = new FFmpeg();

  const useMultiThread = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  const baseURL = useMultiThread
    ? 'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/esm'
    : 'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm';

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      ...(useMultiThread
        ? { workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript') }
        : {}),
    });
  } catch (err) {
    throw new Error(
      `Failed to load FFmpeg ${useMultiThread ? 'multi-threaded' : 'core'} engine: ${String(err)}`,
    );
  }

  const fps = timeline.fps || 30;
  const durationMs = Math.max(1000, timeline.durationMs);
  const totalFrames = Math.ceil((durationMs / 1000) * fps);

  const canvas = document.createElement('canvas');
  canvas.width = timeline.resolution.width;
  canvas.height = timeline.resolution.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context for export.');

  const compositor = new Compositor();

  onProgress(15, `Rendering ${totalFrames} frames (${useMultiThread ? 'Multi-threaded' : 'Standard'})...`);

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const timeMs = (frameIdx / fps) * 1000;
    compositor.syncVideoElements(timeline, timeMs, false);
    compositor.renderFrame(ctx, timeline, timeMs, null);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const fileName = `frame_${String(frameIdx).padStart(6, '0')}.jpg`;
      await ffmpeg.writeFile(fileName, buf);
    }

    if (frameIdx % 5 === 0 || frameIdx === totalFrames - 1) {
      const pct = 15 + Math.round((frameIdx / totalFrames) * 55);
      onProgress(pct, `Rendering frame ${frameIdx + 1} / ${totalFrames}`);
    }
  }

  compositor.dispose();
  onProgress(75, 'Encoding MP4 with H.264...');

  ffmpeg.on('progress', ({ progress }) => {
    const pct = 75 + Math.min(20, Math.round(progress * 20));
    onProgress(pct, 'Encoding MP4...');
  });

  await ffmpeg.exec([
    '-framerate',
    String(fps),
    '-i',
    'frame_%06d.jpg',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    'boovy_export.mp4',
  ]);

  onProgress(96, 'Finalizing MP4...');
  const data = await ffmpeg.readFile('boovy_export.mp4');
  const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const copy = new Uint8Array(uint8.byteLength);
  copy.set(uint8);

  onProgress(100, 'Export complete!');
  return new Blob([copy.buffer], { type: 'video/mp4' });
}
