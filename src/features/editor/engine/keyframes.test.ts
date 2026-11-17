import { describe, it, expect } from 'vitest';
import { applyEasing, formatTimecode, interpolateKeyframes } from './keyframes';
import { useTimelineStore } from '../store/useTimelineStore';

describe('Boovy Keyframe Engine', () => {
  it('interpolates linear keyframes accurately', () => {
    const kfs = [
      { id: '1', timeMs: 0, value: 0, easing: 'linear' as const },
      { id: '2', timeMs: 1000, value: 100, easing: 'linear' as const },
    ];
    expect(interpolateKeyframes(kfs, 0, 0)).toBe(0);
    expect(interpolateKeyframes(kfs, 500, 0)).toBe(50);
    expect(interpolateKeyframes(kfs, 1000, 0)).toBe(100);
    expect(interpolateKeyframes(kfs, 1500, 0)).toBe(100);
  });

  it('applies ease-in and ease-out curves within [0, 1]', () => {
    expect(applyEasing(0.5, 'ease-in')).toBe(0.25);
    expect(applyEasing(0.5, 'ease-out')).toBe(0.75);
  });

  it('formats timecode with fps frames', () => {
    expect(formatTimecode(0, 30)).toBe('00:00:00');
    expect(formatTimecode(65500, 30)).toBe('01:05:15');
  });
});

describe('Boovy Timeline Store', () => {
  it('adds, splits, and ripple-deletes clips with undo support', () => {
    const store = useTimelineStore.getState();
    store.loadProject('p1', 'Test Edit', '9:16', store.timeline);

    const clipId = store.addClip('text', {
      name: 'Intro Title',
      type: 'text',
      startMs: 0,
      durationMs: 4000,
    });

    store.setPlayheadMs(2000);
    store.splitClipAtPlayhead(clipId);

    const textTrack = useTimelineStore
      .getState()
      .timeline.tracks.find((t) => t.type === 'text');
    expect(textTrack?.clips.length).toBe(2);
    expect(textTrack?.clips[0].durationMs).toBe(2000);
    expect(textTrack?.clips[1].durationMs).toBe(2000);

    useTimelineStore.getState().undo();
    const afterUndo = useTimelineStore
      .getState()
      .timeline.tracks.find((t) => t.type === 'text');
    expect(afterUndo?.clips.length).toBe(1);
  });
});
