import { useRef } from 'react';
import { Scissors, Trash2, Eye, EyeOff, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';

export function Timeline() {
  const {
    timeline,
    playheadMs,
    selectedClipId,
    zoomPxPerSec,
    setPlayheadMs,
    selectClip,
    setZoomPxPerSec,
    splitClipAtPlayhead,
    deleteClip,
    updateClip,
    toggleTrackMute,
    toggleTrackVisibility,
  } = useTimelineStore();

  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const totalWidthPx = Math.max(800, (timeline.durationMs / 1000) * zoomPxPerSec + 120);
  const playheadPx = (playheadMs / 1000) * zoomPxPerSec;

  const handleRulerPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const ms = (x / zoomPxPerSec) * 1000;
    setPlayheadMs(ms);
  };

  const handleClipDrag = (e: React.PointerEvent<HTMLDivElement>, clipId: string, origStartMs: number) => {
    e.stopPropagation();
    selectClip(clipId);
    const startX = e.clientX;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const deltaMs = (dx / zoomPxPerSec) * 1000;
      updateClip(
        clipId,
        (c) => {
          c.startMs = Math.max(0, Math.round(origStartMs + deltaMs));
        },
        false,
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleClipTrimRight = (
    e: React.PointerEvent<HTMLDivElement>,
    clipId: string,
    origDurationMs: number,
  ) => {
    e.stopPropagation();
    const startX = e.clientX;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const deltaMs = (dx / zoomPxPerSec) * 1000;
      updateClip(
        clipId,
        (c) => {
          c.durationMs = Math.max(300, Math.round(origDurationMs + deltaMs));
        },
        false,
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const trackColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-[#1F3A52] border-[#3B82F6]';
      case 'overlay':
        return 'bg-[#3B264B] border-[#A855F7]';
      case 'text':
        return 'bg-[#163C34] border-[#00A47C]';
      case 'audio':
      default:
        return 'bg-[#3E2C1B] border-[#F49342]';
    }
  };

  const secondsCount = Math.ceil(timeline.durationMs / 1000) + 2;

  return (
    <div className="flex flex-col h-full bg-[#14161A] border-t border-[#262930] select-none">
      {/* Timeline Toolbar */}
      <div className="h-10 border-b border-[#262930] px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!selectedClipId}
            onClick={() => splitClipAtPlayhead()}
            className="h-7 px-2.5 rounded bg-[#1D2026] hover:bg-[#262930] disabled:opacity-40 text-[#F1F2F4] text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Split</span>
          </button>

          <button
            type="button"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && deleteClip(selectedClipId, true)}
            className="h-7 px-2.5 rounded bg-[#1D2026] hover:bg-red-900/50 disabled:opacity-40 text-[#F1F2F4] text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ripple Delete</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[#8C9196]">
          <button
            type="button"
            onClick={() => setZoomPxPerSec(zoomPxPerSec - 15)}
            className="p-1 hover:text-[#F1F2F4] cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={20}
            max={200}
            value={zoomPxPerSec}
            onChange={(e) => setZoomPxPerSec(Number(e.target.value))}
            aria-label="Timeline zoom"
            className="w-20 accent-[#00A47C] h-1 bg-[#262930] rounded cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setZoomPxPerSec(zoomPxPerSec + 15)}
            className="p-1 hover:text-[#F1F2F4] cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tracks + Ruler Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Track Headers */}
        <div className="w-28 sm:w-40 bg-[#14161A] border-r border-[#262930] shrink-0 pt-6 overflow-y-auto studio-scroll">
          {timeline.tracks.map((track) => (
            <div
              key={track.id}
              className="h-12 px-2.5 border-b border-[#262930] flex items-center justify-between gap-1"
            >
              <span className="text-[11px] font-medium text-[#F1F2F4] truncate">
                {track.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTrackVisibility(track.id)}
                  className="p-1 text-[#8C9196] hover:text-[#F1F2F4] cursor-pointer"
                  title="Toggle visibility"
                >
                  {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleTrackMute(track.id)}
                  className="p-1 text-[#8C9196] hover:text-[#F1F2F4] cursor-pointer"
                  title="Toggle mute"
                >
                  {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Canvas */}
        <div ref={tracksScrollRef} className="flex-1 overflow-auto studio-scroll relative bg-[#0B0C0E]">
          <div style={{ width: totalWidthPx }} className="relative min-h-full">
            {/* Time Ruler */}
            <div
              onPointerDown={handleRulerPointer}
              className="h-6 border-b border-[#262930] bg-[#14161A] relative cursor-pointer sticky top-0 z-10"
            >
              {Array.from({ length: secondsCount }).map((_, sec) => (
                <div
                  key={sec}
                  style={{ left: sec * zoomPxPerSec }}
                  className="absolute top-0 bottom-0 border-l border-[#262930] pl-1 text-[10px] font-mono text-[#8C9196]"
                >
                  {sec}s
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className="h-12 border-b border-[#262930]/70 relative"
              >
                {track.clips.map((clip) => {
                  const left = (clip.startMs / 1000) * zoomPxPerSec;
                  const width = Math.max(24, (clip.durationMs / 1000) * zoomPxPerSec);
                  const selected = clip.id === selectedClipId;
                  const hasMultipleKeyframes = Object.values(clip.keyframes).some(
                    (kfs) => kfs.length > 1,
                  );

                  return (
                    <div
                      key={clip.id}
                      onPointerDown={(e) => handleClipDrag(e, clip.id, clip.startMs)}
                      style={{ left, width }}
                      className={`absolute top-1.5 bottom-1.5 rounded-md border px-2 flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing ${trackColor(
                        track.type,
                      )} ${selected ? 'ring-2 ring-[#5C6AC4]' : ''}`}
                    >
                      <span className="text-[11px] font-medium text-white truncate">
                        {clip.name}
                      </span>

                      {hasMultipleKeyframes && (
                        <span
                          title="Has keyframe animation"
                          className="text-[#F49342] text-[10px] ml-1 shrink-0"
                        >
                          ◆
                        </span>
                      )}

                      {/* Right Trim Handle */}
                      <div
                        onPointerDown={(e) => handleClipTrimRight(e, clip.id, clip.durationMs)}
                        title="Drag to trim duration"
                        className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 hover:bg-white/60 cursor-ew-resize"
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead Line */}
            <div
              style={{ transform: `translateX(${playheadPx}px)` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#00A47C] pointer-events-none z-20"
            >
              <div className="w-3 h-3 -ml-[5px] bg-[#00A47C] rotate-45 -mt-1 rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
