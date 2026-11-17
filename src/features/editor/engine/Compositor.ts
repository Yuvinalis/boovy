import type { BoovyTimeline, Clip } from '../../../types/timeline';
import { evaluateClipTransform } from './keyframes';

type MediaEntry =
  | { kind: 'video'; el: HTMLVideoElement; ready: boolean }
  | { kind: 'image'; el: HTMLImageElement; ready: boolean };

export class Compositor {
  private mediaCache = new Map<string, MediaEntry>();

  private getOrLoadMedia(clip: Clip): MediaEntry | null {
    if (!clip.sourceUrl) return null;
    const cached = this.mediaCache.get(clip.sourceUrl);
    if (cached) return cached;

    if (clip.type === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.muted = true;
      video.preload = 'auto';
      video.src = clip.sourceUrl;
      const entry: MediaEntry = { kind: 'video', el: video, ready: false };
      video.addEventListener('loadeddata', () => {
        entry.ready = true;
      });
      this.mediaCache.set(clip.sourceUrl, entry);
      return entry;
    }

    if (clip.type === 'image' || clip.type === 'meme') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.sourceUrl;
      const entry: MediaEntry = { kind: 'image', el: img, ready: false };
      img.addEventListener('load', () => {
        entry.ready = true;
      });
      this.mediaCache.set(clip.sourceUrl, entry);
      return entry;
    }

    return null;
  }

  public syncVideoElements(timeline: BoovyTimeline, timeMs: number, isPlaying: boolean) {
    for (const track of timeline.tracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        if (clip.type !== 'video' || !clip.sourceUrl) continue;
        const entry = this.getOrLoadMedia(clip);
        if (!entry || entry.kind !== 'video') continue;

        const isActive = timeMs >= clip.startMs && timeMs <= clip.startMs + clip.durationMs;
        const video = entry.el;
        video.muted = track.muted || clip.volume === 0;
        video.volume = track.muted ? 0 : clip.volume;
        video.playbackRate = clip.speed;

        if (!isActive) {
          if (!video.paused) video.pause();
          continue;
        }

        const targetSec = (clip.sourceStartMs + (timeMs - clip.startMs) * clip.speed) / 1000;
        if (Math.abs(video.currentTime - targetSec) > (isPlaying ? 0.25 : 0.04)) {
          video.currentTime = Math.max(0, targetSec);
        }

        if (isPlaying && video.paused) {
          video.play().catch(() => {});
        } else if (!isPlaying && !video.paused) {
          video.pause();
        }
      }
    }
  }

  public renderFrame(
    ctx: CanvasRenderingContext2D,
    timeline: BoovyTimeline,
    timeMs: number,
    selectedClipId?: string | null,
  ) {
    const { width, height } = timeline.resolution;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render tracks bottom-to-top (last track in array = background, first = foreground)
    const tracksBottomUp = [...timeline.tracks].reverse();

    for (const track of tracksBottomUp) {
      if (!track.visible || track.type === 'audio') continue;

      for (const clip of track.clips) {
        if (timeMs < clip.startMs || timeMs > clip.startMs + clip.durationMs) continue;
        this.renderClip(ctx, clip, timeMs, width, height, clip.id === selectedClipId);
      }
    }
  }

  private renderClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    timeMs: number,
    canvasW: number,
    canvasH: number,
    isSelected: boolean,
  ) {
    const transform = evaluateClipTransform(clip, timeMs);
    const relMs = timeMs - clip.startMs;

    // Transition calculations
    let transAlpha = 1;
    let transOffsetX = 0;
    let transOffsetY = 0;
    let transScale = 1;

    if (clip.transitionIn.type !== 'none' && relMs < clip.transitionIn.durationMs) {
      const p = Math.max(0, Math.min(1, relMs / clip.transitionIn.durationMs));
      switch (clip.transitionIn.type) {
        case 'fade':
          transAlpha = p;
          break;
        case 'slide-left':
          transOffsetX = (1 - p) * canvasW;
          break;
        case 'slide-up':
          transOffsetY = (1 - p) * canvasH;
          break;
        case 'zoom-in':
          transScale = 0.5 + 0.5 * p;
          transAlpha = p;
          break;
        case 'wipe-right':
          transAlpha = p;
          break;
      }
    }

    const timeRemaining = clip.durationMs - relMs;
    if (clip.transitionOut.type !== 'none' && timeRemaining < clip.transitionOut.durationMs) {
      const p = Math.max(0, Math.min(1, timeRemaining / clip.transitionOut.durationMs));
      if (clip.transitionOut.type === 'fade') transAlpha *= p;
      if (clip.transitionOut.type === 'zoom-in') transScale *= 0.8 + 0.2 * p;
    }

    ctx.save();
    ctx.globalCompositeOperation = clip.blendMode;
    ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * transAlpha));
    ctx.filter = `brightness(${clip.filters.brightness}%) contrast(${clip.filters.contrast}%) saturate(${clip.filters.saturate}%) blur(${clip.filters.blur}px) grayscale(${clip.filters.grayscale}%)`;

    const centerX = canvasW / 2 + transform.x + transOffsetX;
    const centerY = canvasH / 2 + transform.y + transOffsetY;
    ctx.translate(centerX, centerY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale * transScale, transform.scale * transScale);

    let boxW = canvasW * 0.6;
    let boxH = canvasH * 0.3;

    if (clip.type === 'text' && clip.textStyle) {
      const ts = clip.textStyle;
      ctx.font = `${ts.fontWeight} ${ts.fontSize}px ${ts.fontFamily || 'Inter, sans-serif'}`;
      ctx.textAlign = ts.align;
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(ts.text);
      boxW = Math.max(120, metrics.width + 48);
      boxH = ts.fontSize * 1.6;

      if (ts.backgroundColor) {
        ctx.fillStyle = ts.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 16);
        ctx.fill();
      }
      ctx.fillStyle = ts.color;
      ctx.fillText(ts.text, 0, 0);
    } else {
      const entry = this.getOrLoadMedia(clip);
      if (entry && entry.ready) {
        const mediaW =
          entry.kind === 'video' ? entry.el.videoWidth || canvasW : entry.el.naturalWidth || canvasW;
        const mediaH =
          entry.kind === 'video' ? entry.el.videoHeight || canvasH : entry.el.naturalHeight || canvasH;

        const fitScale = Math.min(canvasW / mediaW, canvasH / mediaH);
        boxW = mediaW * fitScale;
        boxH = mediaH * fitScale;
        ctx.drawImage(entry.el, -boxW / 2, -boxH / 2, boxW, boxH);
      } else {
        ctx.fillStyle = '#1D2026';
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
        ctx.fillStyle = '#8C9196';
        ctx.font = '600 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(clip.name, 0, 0);
      }
    }

    if (isSelected) {
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#5C6AC4';
      ctx.lineWidth = 4;
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Corner handles
      const corners = [
        [-boxW / 2, -boxH / 2],
        [boxW / 2, -boxH / 2],
        [-boxW / 2, boxH / 2],
        [boxW / 2, boxH / 2],
      ];
      ctx.fillStyle = '#FFFFFF';
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public dispose() {
    for (const entry of this.mediaCache.values()) {
      if (entry.kind === 'video') {
        entry.el.pause();
        entry.el.src = '';
      }
    }
    this.mediaCache.clear();
  }
}
