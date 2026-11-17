import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import type {
  AspectRatioKey,
  BoovyTimeline,
  Clip,
  ClipFilters,
  EasingType,
  KeyframeProperty,
  TrackKind,
  TransitionRef,
} from '../../../types/timeline';
import { ASPECT_RATIO_PRESETS } from '../../../types/timeline';
import {
  createDefaultKeyframes,
  createDefaultTimeline,
  getKeyframeDefaultValue,
  interpolateKeyframes,
  uid,
} from '../engine/keyframes';

interface TimelineState {
  projectId: string | null;
  projectTitle: string;
  aspectRatio: AspectRatioKey;
  timeline: BoovyTimeline;
  playheadMs: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  zoomPxPerSec: number;
  isDirty: boolean;
  historyPast: BoovyTimeline[];
  historyFuture: BoovyTimeline[];

  // Actions
  loadProject: (id: string, title: string, aspectRatio: AspectRatioKey, timeline: BoovyTimeline) => void;
  setProjectTitle: (title: string) => void;
  setAspectRatio: (ratio: AspectRatioKey) => void;
  setPlayheadMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  selectClip: (clipId: string | null) => void;
  setZoomPxPerSec: (px: number) => void;
  markSaved: () => void;

  undo: () => void;
  redo: () => void;

  addClip: (trackType: TrackKind, clip: Partial<Clip> & { name: string; type: Clip['type'] }) => string;
  updateClip: (clipId: string, updater: (clip: Clip) => void, recordHistory?: boolean) => void;
  deleteClip: (clipId: string, ripple?: boolean) => void;
  splitClipAtPlayhead: (clipId?: string) => void;

  upsertKeyframe: (clipId: string, prop: KeyframeProperty, value: number, easing?: EasingType) => void;
  removeKeyframe: (clipId: string, prop: KeyframeProperty, keyframeId: string) => void;
  updateClipFilters: (clipId: string, filters: Partial<ClipFilters>) => void;
  updateClipTransition: (clipId: string, edge: 'in' | 'out', transition: TransitionRef) => void;

  toggleTrackMute: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
}

function recalcDuration(timeline: BoovyTimeline) {
  let maxEnd = 10000;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      const end = clip.startMs + clip.durationMs;
      if (end > maxEnd) maxEnd = end;
    }
  }
  timeline.durationMs = maxEnd;
}

function pushHistory(state: TimelineState) {
  state.historyPast.push(structuredClone(current(state.timeline)));
  if (state.historyPast.length > 40) state.historyPast.shift();
  state.historyFuture = [];
  state.isDirty = true;
}

export const useTimelineStore = create<TimelineState>()(
  immer((set) => ({
    projectId: null,
    projectTitle: 'Untitled Boovy Edit',
    aspectRatio: '9:16',
    timeline: createDefaultTimeline('9:16'),
    playheadMs: 0,
    isPlaying: false,
    selectedClipId: null,
    zoomPxPerSec: 60,
    isDirty: false,
    historyPast: [],
    historyFuture: [],

    loadProject: (id, title, aspectRatio, timeline) =>
      set((state) => {
        state.projectId = id;
        state.projectTitle = title;
        state.aspectRatio = aspectRatio;
        state.timeline = timeline?.tracks?.length ? timeline : createDefaultTimeline(aspectRatio);
        state.playheadMs = 0;
        state.isPlaying = false;
        state.selectedClipId = null;
        state.isDirty = false;
        state.historyPast = [];
        state.historyFuture = [];
      }),

    setProjectTitle: (title) =>
      set((state) => {
        state.projectTitle = title;
        state.isDirty = true;
      }),

    setAspectRatio: (ratio) =>
      set((state) => {
        pushHistory(state);
        state.aspectRatio = ratio;
        const preset = ASPECT_RATIO_PRESETS[ratio];
        state.timeline.resolution = { width: preset.width, height: preset.height };
      }),

    setPlayheadMs: (ms) =>
      set((state) => {
        state.playheadMs = Math.max(0, Math.min(state.timeline.durationMs, ms));
      }),

    setIsPlaying: (playing) =>
      set((state) => {
        state.isPlaying = playing;
      }),

    selectClip: (clipId) =>
      set((state) => {
        state.selectedClipId = clipId;
      }),

    setZoomPxPerSec: (px) =>
      set((state) => {
        state.zoomPxPerSec = Math.max(20, Math.min(200, px));
      }),

    markSaved: () =>
      set((state) => {
        state.isDirty = false;
      }),

    undo: () =>
      set((state) => {
        const prev = state.historyPast.pop();
        if (!prev) return;
        state.historyFuture.push(structuredClone(current(state.timeline)));
        state.timeline = prev;
        state.isDirty = true;
      }),

    redo: () =>
      set((state) => {
        const next = state.historyFuture.pop();
        if (!next) return;
        state.historyPast.push(structuredClone(current(state.timeline)));
        state.timeline = next;
        state.isDirty = true;
      }),

    addClip: (trackType, partial) => {
      const id = uid('clip');
      set((state) => {
        pushHistory(state);
        let track = state.timeline.tracks.find((t) => t.type === trackType);
        if (!track) {
          track = {
            id: uid('trk'),
            type: trackType,
            name: trackType.toUpperCase(),
            muted: false,
            locked: false,
            visible: true,
            clips: [],
          };
          state.timeline.tracks.unshift(track);
        }

        const defaultStart =
          partial.startMs ??
          (track.clips.length > 0
            ? Math.max(...track.clips.map((c) => c.startMs + c.durationMs))
            : state.playheadMs);

        const newClip: Clip = {
          id,
          assetId: partial.assetId,
          sourceUrl: partial.sourceUrl,
          name: partial.name,
          type: partial.type,
          startMs: defaultStart,
          durationMs: partial.durationMs ?? 4000,
          sourceStartMs: partial.sourceStartMs ?? 0,
          speed: partial.speed ?? 1,
          volume: partial.volume ?? 1,
          blendMode: partial.blendMode ?? 'source-over',
          keyframes: partial.keyframes ?? createDefaultKeyframes(),
          filters: partial.filters ?? {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            blur: 0,
            grayscale: 0,
          },
          transitionIn: partial.transitionIn ?? { type: 'none', durationMs: 400 },
          transitionOut: partial.transitionOut ?? { type: 'none', durationMs: 400 },
          textStyle: partial.textStyle,
        };

        track.clips.push(newClip);
        state.selectedClipId = id;
        recalcDuration(state.timeline);
      });
      return id;
    },

    updateClip: (clipId, updater, recordHistory = true) =>
      set((state) => {
        if (recordHistory) pushHistory(state);
        else state.isDirty = true;

        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            updater(clip);
            recalcDuration(state.timeline);
            break;
          }
        }
      }),

    deleteClip: (clipId, ripple = false) =>
      set((state) => {
        pushHistory(state);
        for (const track of state.timeline.tracks) {
          const idx = track.clips.findIndex((c) => c.id === clipId);
          if (idx !== -1) {
            const [removed] = track.clips.splice(idx, 1);
            if (ripple) {
              for (const c of track.clips) {
                if (c.startMs > removed.startMs) {
                  c.startMs = Math.max(0, c.startMs - removed.durationMs);
                }
              }
            }
            if (state.selectedClipId === clipId) state.selectedClipId = null;
            recalcDuration(state.timeline);
            break;
          }
        }
      }),

    splitClipAtPlayhead: (targetClipId) =>
      set((state) => {
        const clipId = targetClipId ?? state.selectedClipId;
        if (!clipId) return;
        const cutMs = state.playheadMs;

        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (!clip) continue;
          if (cutMs <= clip.startMs + 100 || cutMs >= clip.startMs + clip.durationMs - 100) {
            return;
          }
          pushHistory(state);
          const leftDuration = cutMs - clip.startMs;
          const rightDuration = clip.durationMs - leftDuration;

          const rightClip: Clip = structuredClone(current(clip));
          rightClip.id = uid('clip');
          rightClip.startMs = cutMs;
          rightClip.durationMs = rightDuration;
          rightClip.sourceStartMs = clip.sourceStartMs + leftDuration * clip.speed;

          clip.durationMs = leftDuration;
          track.clips.push(rightClip);
          state.selectedClipId = rightClip.id;
          break;
        }
      }),

    upsertKeyframe: (clipId, prop, value, easing = 'ease-out') =>
      set((state) => {
        pushHistory(state);
        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (!clip) continue;
          const relMs = Math.max(0, Math.min(clip.durationMs, state.playheadMs - clip.startMs));
          const list = clip.keyframes[prop];
          const existing = list.find((k) => Math.abs(k.timeMs - relMs) < 40);
          if (existing) {
            existing.value = value;
            existing.easing = easing;
          } else {
            list.push({ id: uid('kf'), timeMs: relMs, value, easing });
            list.sort((a, b) => a.timeMs - b.timeMs);
          }
          break;
        }
      }),

    removeKeyframe: (clipId, prop, keyframeId) =>
      set((state) => {
        pushHistory(state);
        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (!clip) continue;
          const list = clip.keyframes[prop];
          if (list.length <= 1) {
            // Reset to default if removing the last keyframe
            list[0].value = interpolateKeyframes([], 0, getKeyframeDefaultValue(prop));
            return;
          }
          clip.keyframes[prop] = list.filter((k) => k.id !== keyframeId);
          break;
        }
      }),

    updateClipFilters: (clipId, filters) =>
      set((state) => {
        pushHistory(state);
        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.filters = { ...clip.filters, ...filters };
            break;
          }
        }
      }),

    updateClipTransition: (clipId, edge, transition) =>
      set((state) => {
        pushHistory(state);
        for (const track of state.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            if (edge === 'in') clip.transitionIn = transition;
            else clip.transitionOut = transition;
            break;
          }
        }
      }),

    toggleTrackMute: (trackId) =>
      set((state) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.muted = !track.muted;
      }),

    toggleTrackVisibility: (trackId) =>
      set((state) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.visible = !track.visible;
      }),

    toggleTrackLock: (trackId) =>
      set((state) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.locked = !track.locked;
      }),
  })),
);
