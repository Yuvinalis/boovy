import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';
import { Compositor } from '../engine/Compositor';
import { evaluateClipTransform, formatTimecode } from '../engine/keyframes';

export function StageViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  const {
    timeline,
    playheadMs,
    isPlaying,
    selectedClipId,
    setPlayheadMs,
    setIsPlaying,
    updateClip,
    upsertKeyframe,
  } = useTimelineStore();

  useEffect(() => {
    const comp = new Compositor();
    compositorRef.current = comp;
    return () => comp.dispose();
  }, []);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const state = useTimelineStore.getState();
      const nextMs = state.playheadMs + dt;
      if (nextMs >= state.timeline.durationMs) {
        state.setPlayheadMs(0);
        state.setIsPlaying(false);
        return;
      }
      state.setPlayheadMs(nextMs);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Render frame whenever timeline, playhead, or selection changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const comp = compositorRef.current;
    if (!canvas || !comp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    comp.syncVideoElements(timeline, playheadMs, isPlaying);
    comp.renderFrame(ctx, timeline, playheadMs, selectedClipId);
  }, [timeline, playheadMs, isPlaying, selectedClipId]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedClipId) return;
    for (const track of timeline.tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) {
        const tf = evaluateClipTransform(clip, playheadMs);
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: tf.x,
          origY: tf.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !selectedClipId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = timeline.resolution.width / rect.width;
    const scaleY = timeline.resolution.height / rect.height;
    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;

    const newX = Math.round(dragRef.current.origX + dx);
    const newY = Math.round(dragRef.current.origY + dy);

    updateClip(
      selectedClipId,
      (clip) => {
        if (clip.keyframes.x.length <= 1) clip.keyframes.x[0].value = newX;
        if (clip.keyframes.y.length <= 1) clip.keyframes.y[0].value = newY;
      },
      false,
    );
    if (playheadMs > 0) {
      upsertKeyframe(selectedClipId, 'x', newX);
      upsertKeyframe(selectedClipId, 'y', newY);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0B0C0E] min-h-0 overflow-hidden">
      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-5 min-h-0">
        <div
          className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl border border-[#262930] rounded-lg overflow-hidden bg-black"
          style={{
            aspectRatio: `${timeline.resolution.width} / ${timeline.resolution.height}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={timeline.resolution.width}
            height={timeline.resolution.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="max-h-full max-w-full w-auto h-auto object-contain touch-none cursor-move"
          />
        </div>
      </div>

      {/* Transport Bar */}
      <div className="h-11 bg-[#14161A] border-t border-[#262930] px-4 flex items-center justify-between shrink-0">
        <div className="font-timecode text-xs text-[#F1F2F4]">
          <span className="text-[#00A47C]">{formatTimecode(playheadMs, timeline.fps)}</span>
          <span className="text-[#8C9196]"> / {formatTimecode(timeline.durationMs, timeline.fps)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setPlayheadMs(0);
            }}
            title="Jump to start"
            className="h-8 w-8 rounded-lg hover:bg-[#1D2026] text-[#8C9196] hover:text-[#F1F2F4] flex items-center justify-center cursor-pointer"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
            className="h-8 w-8 rounded-full bg-[#008060] hover:bg-[#006E52] text-white flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#8C9196] hidden sm:block">
          {timeline.resolution.width}×{timeline.resolution.height} · {timeline.fps}fps
        </div>
      </div>
    </div>
  );
}
