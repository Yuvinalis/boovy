import { useState } from 'react';
import { Film, Type, Sparkles, Sliders, Scissors, X } from 'lucide-react';
import { StageViewport } from './StageViewport';
import { Timeline } from './Timeline';
import { AssetRail } from './AssetRail';
import { InspectorPanel } from './InspectorPanel';
import { useTimelineStore } from '../store/useTimelineStore';

type MobileDrawer = 'media' | 'text' | 'memes' | 'inspector' | null;

export function MobileStudio() {
  const [drawer, setDrawer] = useState<MobileDrawer>(null);
  const { selectedClipId, splitClipAtPlayhead } = useTimelineStore();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B0C0E] relative">
      {/* Sticky Preview */}
      <div className="h-[42vh] min-h-[220px] flex flex-col border-b border-[#262930]">
        <StageViewport />
      </div>

      {/* Scrubbable Timeline */}
      <div className="flex-1 min-h-0">
        <Timeline />
      </div>

      {/* Touch-First Bottom Action Dock (44px+ targets) */}
      <nav className="h-16 bg-[#14161A] border-t border-[#262930] px-2 flex items-center justify-around shrink-0">
        {[
          { id: 'media' as const, label: 'Media', icon: Film },
          { id: 'text' as const, label: 'Text', icon: Type },
          { id: 'memes' as const, label: 'Memes', icon: Sparkles },
          { id: 'inspector' as const, label: 'Edit', icon: Sliders },
        ].map((item) => {
          const Icon = item.icon;
          const active = drawer === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setDrawer(active ? null : item.id)}
              className={`min-h-[44px] min-w-[56px] px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                active ? 'text-[#00A47C] bg-[#1D2026]' : 'text-[#8C9196]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={!selectedClipId}
          onClick={() => splitClipAtPlayhead()}
          className="min-h-[44px] min-w-[56px] px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#8C9196] disabled:opacity-40 cursor-pointer"
        >
          <Scissors className="h-5 w-5" />
          <span>Split</span>
        </button>
      </nav>

      {/* Slide-Up Tool Drawer */}
      {drawer && (
        <div className="absolute inset-x-0 bottom-16 h-[48vh] bg-[#14161A] border-t border-[#262930] rounded-t-2xl shadow-2xl z-30 flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-[#262930] flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F2F4]">
              {drawer}
            </span>
            <button
              type="button"
              onClick={() => setDrawer(null)}
              className="p-1.5 rounded-lg text-[#8C9196] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {drawer === 'inspector' ? (
              <InspectorPanel />
            ) : (
              <AssetRail initialTab={drawer} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
