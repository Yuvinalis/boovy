import type {
  AspectRatioKey,
  BoovyTimeline,
  Clip,
  ClipKeyframes,
  EasingType,
  Keyframe,
  KeyframeProperty,
} from '../../../types/timeline';
import { ASPECT_RATIO_PRESETS } from '../../../types/timeline';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'ease-in':
      return clamped * clamped;
    case 'ease-out':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'ease-in-out':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'linear':
    default:
      return clamped;
  }
}

export function interpolateKeyframes(
  keyframes: Keyframe<number>[],
  relativeTimeMs: number,
  fallback: number,
): number {
  if (!keyframes || keyframes.length === 0) return fallback;
  if (keyframes.length === 1) return keyframes[0].value;

  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);

  if (relativeTimeMs <= sorted[0].timeMs) return sorted[0].value;
  if (relativeTimeMs >= sorted[sorted.length - 1].timeMs) {
    return sorted[sorted.length - 1].value;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (relativeTimeMs >= k1.timeMs && relativeTimeMs <= k2.timeMs) {
      const span = k2.timeMs - k1.timeMs;
      if (span <= 0) return k2.value;
      const rawT = (relativeTimeMs - k1.timeMs) / span;
      const easedT = applyEasing(rawT, k2.easing);
      return k1.value + (k2.value - k1.value) * easedT;
    }
  }

  return fallback;
}

export function evaluateClipTransform(clip: Clip, timelineTimeMs: number) {
  const rel = Math.max(0, timelineTimeMs - clip.startMs);
  return {
    x: interpolateKeyframes(clip.keyframes.x, rel, 0),
    y: interpolateKeyframes(clip.keyframes.y, rel, 0),
    scale: interpolateKeyframes(clip.keyframes.scale, rel, 1),
    rotation: interpolateKeyframes(clip.keyframes.rotation, rel, 0),
    opacity: interpolateKeyframes(clip.keyframes.opacity, rel, 1),
  };
}

export function createDefaultKeyframes(): ClipKeyframes {
  return {
    x: [{ id: uid('kf'), timeMs: 0, value: 0, easing: 'ease-out' }],
    y: [{ id: uid('kf'), timeMs: 0, value: 0, easing: 'ease-out' }],
    scale: [{ id: uid('kf'), timeMs: 0, value: 1, easing: 'ease-out' }],
    rotation: [{ id: uid('kf'), timeMs: 0, value: 0, easing: 'ease-out' }],
    opacity: [{ id: uid('kf'), timeMs: 0, value: 1, easing: 'ease-out' }],
  };
}

export function createDefaultTimeline(aspectRatio: AspectRatioKey = '9:16'): BoovyTimeline {
  const preset = ASPECT_RATIO_PRESETS[aspectRatio];
  return {
    version: 1,
    fps: 30,
    resolution: { width: preset.width, height: preset.height },
    durationMs: 15000,
    tracks: [
      { id: uid('trk'), type: 'text', name: 'Text & Captions', muted: false, locked: false, visible: true, clips: [] },
      { id: uid('trk'), type: 'overlay', name: 'Memes & Overlays', muted: false, locked: false, visible: true, clips: [] },
      { id: uid('trk'), type: 'video', name: 'Main Video', muted: false, locked: false, visible: true, clips: [] },
      { id: uid('trk'), type: 'audio', name: 'Audio & SFX', muted: false, locked: false, visible: true, clips: [] },
    ],
  };
}

export function formatTimecode(ms: number, fps = 30): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const frames = Math.floor(((safe % 1000) / 1000) * fps);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function getKeyframeDefaultValue(prop: KeyframeProperty): number {
  switch (prop) {
    case 'scale':
    case 'opacity':
      return 1;
    default:
      return 0;
  }
}
