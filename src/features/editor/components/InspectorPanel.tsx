import { Diamond, Sliders, Sparkles } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';
import { evaluateClipTransform } from '../engine/keyframes';
import type { EasingType, KeyframeProperty, TransitionType } from '../../../types/timeline';

export function InspectorPanel() {
  const {
    timeline,
    playheadMs,
    selectedClipId,
    updateClip,
    upsertKeyframe,
    updateClipFilters,
    updateClipTransition,
  } = useTimelineStore();

  const selectedClip = timeline.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId);

  if (!selectedClip) {
    return (
      <div className="h-full bg-[#14161A] text-[#8C9196] p-5 flex flex-col items-center justify-center text-center">
        <Sliders className="h-8 w-8 mb-2 opacity-40" />
        <div className="text-xs font-medium text-[#F1F2F4]">No Clip Selected</div>
        <div className="text-[11px] mt-1">
          Tap a clip on the timeline to edit keyframes, blend modes, filters, or transitions.
        </div>
      </div>
    );
  }

  const tf = evaluateClipTransform(selectedClip, playheadMs);

  const renderKeyframeRow = (
    prop: KeyframeProperty,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
  ) => (
    <div key={prop} className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#8C9196]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[#F1F2F4]">{Number(value.toFixed(2))}</span>
          <button
            type="button"
            onClick={() => upsertKeyframe(selectedClip.id, prop, value, 'ease-out')}
            title="Add / Update Keyframe at Playhead"
            className="p-1 rounded hover:bg-[#1D2026] text-[#F49342] cursor-pointer"
          >
            <Diamond className="h-3 w-3 fill-current" />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => upsertKeyframe(selectedClip.id, prop, Number(e.target.value), 'ease-out')}
        className="w-full accent-[#5C6AC4] h-1.5 bg-[#262930] rounded-lg cursor-pointer"
      />
    </div>
  );

  return (
    <div className="h-full bg-[#14161A] text-[#F1F2F4] overflow-y-auto studio-scroll p-3.5 space-y-5">
      <div>
        <div className="text-xs font-semibold truncate">{selectedClip.name}</div>
        <div className="text-[10px] uppercase text-[#00A47C] font-mono mt-0.5">
          {selectedClip.type} · {(selectedClip.durationMs / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Text Content Editor */}
      {selectedClip.type === 'text' && selectedClip.textStyle && (
        <section className="space-y-2 border-t border-[#262930] pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
            Text Content
          </div>
          <input
            type="text"
            value={selectedClip.textStyle.text}
            onChange={(e) =>
              updateClip(
                selectedClip.id,
                (c) => {
                  if (c.textStyle) c.textStyle.text = e.target.value;
                },
                false,
              )
            }
            className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] text-[#8C9196]">Color</label>
            <input
              type="color"
              value={selectedClip.textStyle.color}
              onChange={(e) =>
                updateClip(selectedClip.id, (c) => {
                  if (c.textStyle) c.textStyle.color = e.target.value;
                })
              }
              className="h-7 w-10 rounded bg-transparent cursor-pointer"
            />
          </div>
        </section>
      )}

      {/* AE Keyframe Transforms */}
      <section className="space-y-2.5 border-t border-[#262930] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
            Keyframes & Transform
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#F49342]" />
        </div>

        {renderKeyframeRow('x', 'Position X', tf.x, -800, 800, 5)}
        {renderKeyframeRow('y', 'Position Y', tf.y, -800, 800, 5)}
        {renderKeyframeRow('scale', 'Scale', tf.scale, 0.1, 3, 0.05)}
        {renderKeyframeRow('rotation', 'Rotation (°)', tf.rotation, -180, 180, 1)}
        {renderKeyframeRow('opacity', 'Opacity', tf.opacity, 0, 1, 0.05)}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#8C9196]">Default Easing</span>
          <select
            defaultValue="ease-out"
            onChange={(e) => {
              const easing = e.target.value as EasingType;
              updateClip(selectedClip.id, (c) => {
                for (const list of Object.values(c.keyframes)) {
                  for (const kf of list) kf.easing = easing;
                }
              });
            }}
            className="rounded border border-[#262930] bg-[#1D2026] text-[11px] px-2 py-1"
          >
            <option value="linear">Linear</option>
            <option value="ease-in">Ease In</option>
            <option value="ease-out">Ease Out</option>
            <option value="ease-in-out">Ease In-Out</option>
          </select>
        </div>
      </section>

      {/* Blend Mode & Speed */}
      <section className="space-y-2.5 border-t border-[#262930] pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
          Compositing & Speed
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#8C9196]">Blend Mode</span>
          <select
            value={selectedClip.blendMode}
            onChange={(e) =>
              updateClip(selectedClip.id, (c) => {
                c.blendMode = e.target.value as GlobalCompositeOperation;
              })
            }
            className="rounded border border-[#262930] bg-[#1D2026] text-[11px] px-2 py-1"
          >
            <option value="source-over">Normal</option>
            <option value="screen">Screen</option>
            <option value="multiply">Multiply</option>
            <option value="overlay">Overlay</option>
            <option value="lighten">Lighten</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8C9196]">Speed</span>
            <span className="font-mono">{selectedClip.speed}x</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={selectedClip.speed}
            onChange={(e) =>
              updateClip(selectedClip.id, (c) => {
                c.speed = Number(e.target.value);
              })
            }
            className="w-full accent-[#00A47C] h-1.5 bg-[#262930] rounded-lg cursor-pointer"
          />
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-2 border-t border-[#262930] pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
          Color & Filters
        </div>
        {[
          { key: 'brightness' as const, label: 'Brightness', min: 20, max: 200 },
          { key: 'contrast' as const, label: 'Contrast', min: 20, max: 200 },
          { key: 'saturate' as const, label: 'Saturation', min: 0, max: 200 },
          { key: 'blur' as const, label: 'Blur (px)', min: 0, max: 20 },
        ].map((f) => (
          <div key={f.key} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#8C9196]">{f.label}</span>
              <span className="font-mono">{selectedClip.filters[f.key]}</span>
            </div>
            <input
              type="range"
              min={f.min}
              max={f.max}
              value={selectedClip.filters[f.key]}
              onChange={(e) =>
                updateClipFilters(selectedClip.id, { [f.key]: Number(e.target.value) })
              }
              className="w-full accent-[#5C6AC4] h-1.5 bg-[#262930] rounded-lg cursor-pointer"
            />
          </div>
        ))}
      </section>

      {/* Transitions */}
      <section className="space-y-2 border-t border-[#262930] pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
          Transitions
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#8C9196]">In</span>
          <select
            value={selectedClip.transitionIn.type}
            onChange={(e) =>
              updateClipTransition(selectedClip.id, 'in', {
                type: e.target.value as TransitionType,
                durationMs: 500,
              })
            }
            className="rounded border border-[#262930] bg-[#1D2026] text-[11px] px-2 py-1"
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="slide-left">Slide Left</option>
            <option value="slide-up">Slide Up</option>
            <option value="zoom-in">Zoom In</option>
          </select>
        </div>
      </section>
    </div>
  );
}
