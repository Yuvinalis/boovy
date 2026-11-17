import { useEffect, useState } from 'react';
import { Upload, Film, Type, Sparkles, Wand2, Plus, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { storageProvider } from '../../../lib/storage/StorageProvider';
import { useTimelineStore } from '../store/useTimelineStore';
import { AssetVaultModal } from '../../library/AssetVaultModal';
import type { AssetRecord, TransitionType } from '../../../types/timeline';

type RailTab = 'media' | 'text' | 'memes' | 'transitions';

const TRANSITIONS: { type: TransitionType; label: string }[] = [
  { type: 'fade', label: 'Cross Fade' },
  { type: 'slide-left', label: 'Slide Left' },
  { type: 'slide-up', label: 'Slide Up' },
  { type: 'zoom-in', label: 'Zoom Pop' },
  { type: 'wipe-right', label: 'Wipe Right' },
];

const MEME_TEMPLATES = [
  { label: 'WAIT A MINUTE 👀', bg: '#111827', color: '#FACC15' },
  { label: 'POV: YOU COOKED 🔥', bg: '#008060', color: '#FFFFFF' },
  { label: 'EMOTIONAL DAMAGE 💀', bg: '#DC2626', color: '#FFFFFF' },
  { label: 'TO BE CONTINUED ➡️', bg: '#5C6AC4', color: '#FFFFFF' },
];

export function AssetRail({ initialTab = 'media' }: { initialTab?: RailTab }) {
  const { addClip, selectedClipId, updateClipTransition } = useTimelineStore();
  const [tab, setTab] = useState<RailTab>(initialTab);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('');
  const [showVaultModal, setShowVaultModal] = useState(false);

  const loadAssets = async (query = searchQuery, tag = activeTag) => {
    const { data, error } = await supabase.rpc('search_boovy_assets', {
      search_query: query,
      filter_tags: tag ? [tag] : [],
      filter_kind: null,
    });

    if (error || !data) return;

    const withUrls = await Promise.all(
      (data as AssetRecord[]).map(async (asset) => {
        try {
          const signedUrl = await storageProvider.getSignedUrl(
            asset.storage_bucket,
            asset.storage_path,
          );
          return { ...asset, signedUrl };
        } catch {
          return asset;
        }
      }),
    );
    setAssets(withUrls);
  };

  useEffect(() => {
    loadAssets(searchQuery, activeTag);
  }, [searchQuery, activeTag]);

  const addTextPreset = (text: string, fontSize: number, color = '#FFFFFF', backgroundColor?: string) => {
    addClip('text', {
      name: text.slice(0, 18),
      type: 'text',
      durationMs: 3500,
      textStyle: {
        text,
        fontSize,
        fontFamily: 'Inter, sans-serif',
        color,
        backgroundColor,
        fontWeight: '700',
        align: 'center',
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#14161A] text-[#F1F2F4]">
      {/* Tab Strip */}
      <div className="grid grid-cols-4 border-b border-[#262930] shrink-0">
        {[
          { id: 'media' as const, label: 'Media', icon: Film },
          { id: 'text' as const, label: 'Text', icon: Type },
          { id: 'memes' as const, label: 'Memes', icon: Sparkles },
          { id: 'transitions' as const, label: 'FX', icon: Wand2 },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`py-2.5 flex flex-col items-center gap-1 text-[11px] font-medium border-b-2 transition-colors cursor-pointer ${
                active
                  ? 'border-[#00A47C] text-[#F1F2F4] bg-[#1D2026]'
                  : 'border-transparent text-[#8C9196] hover:text-[#F1F2F4]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-3">
        {tab === 'media' && (
          <>
            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Upload & Tag Media / Meme</span>
            </button>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#8C9196] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clips, memes, tags..."
                className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {['', 'funny', 'reaction', 'sfx'].map((tag) => (
                <button
                  key={tag || 'all'}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer ${
                    activeTag === tag
                      ? 'bg-[#008060]/20 border-[#00A47C] text-[#00A47C]'
                      : 'bg-[#1D2026] border-[#262930] text-[#8C9196]'
                  }`}
                >
                  {tag ? `#${tag}` : 'All'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    addClip(
                      asset.kind === 'audio' ? 'audio' : asset.kind === 'image' || asset.kind === 'meme' ? 'overlay' : 'video',
                      {
                        assetId: asset.id,
                        sourceUrl: asset.signedUrl,
                        name: asset.title,
                        type: asset.kind === 'transition' || asset.kind === 'effect' ? 'video' : asset.kind,
                        durationMs: asset.duration_ms ?? 5000,
                      },
                    )
                  }
                  className="group rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] p-2 text-left transition-colors cursor-pointer"
                >
                  <div className="h-16 rounded bg-[#0B0C0E] flex items-center justify-center mb-1.5 overflow-hidden">
                    {(asset.kind === 'image' || asset.kind === 'meme') && asset.signedUrl ? (
                      <img
                        src={asset.signedUrl}
                        alt={asset.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-5 w-5 text-[#8C9196] group-hover:text-[#00A47C]" />
                    )}
                  </div>
                  <div className="text-[11px] font-medium truncate">{asset.title}</div>
                  <div className="text-[10px] text-[#8C9196] truncate">
                    {asset.tag_names && asset.tag_names.length > 0
                      ? asset.tag_names.map((t) => `#${t}`).join(' ')
                      : asset.kind.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>

            {showVaultModal && (
              <AssetVaultModal
                onClose={() => setShowVaultModal(false)}
                onUploaded={(record) => {
                  setAssets((prev) => [record, ...prev]);
                  addClip(
                    record.kind === 'audio'
                      ? 'audio'
                      : record.kind === 'image' || record.kind === 'meme'
                        ? 'overlay'
                        : 'video',
                    {
                      assetId: record.id,
                      sourceUrl: record.signedUrl,
                      name: record.title,
                      type: record.kind === 'transition' || record.kind === 'effect' ? 'video' : record.kind,
                      durationMs: 5000,
                    },
                  );
                }}
              />
            )}
          </>
        )}

        {tab === 'text' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => addTextPreset('BIG HEADLINE', 72, '#FFFFFF')}
              className="w-full p-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] text-left cursor-pointer"
            >
              <div className="text-base font-extrabold">Add Headline</div>
              <div className="text-[11px] text-[#8C9196]">Bold 72px title overlay</div>
            </button>
            <button
              type="button"
              onClick={() => addTextPreset('Viral Caption Here', 46, '#FFFFFF', '#000000CC')}
              className="w-full p-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] text-left cursor-pointer"
            >
              <div className="text-sm font-bold">Viral Caption Pill</div>
              <div className="text-[11px] text-[#8C9196]">CapCut-style high-contrast pill</div>
            </button>
            <button
              type="button"
              onClick={() => addTextPreset('@boovy.studio', 36, '#00A47C')}
              className="w-full p-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] text-left cursor-pointer"
            >
              <div className="text-xs font-semibold text-[#00A47C]">Watermark / Handle</div>
              <div className="text-[11px] text-[#8C9196]">Subtle creator tag</div>
            </button>
          </div>
        )}

        {tab === 'memes' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#8C9196]">
              Quick meme reaction banners. Phase 2 adds full tagged community meme & SFX vault.
            </p>
            {MEME_TEMPLATES.map((meme) => (
              <button
                key={meme.label}
                type="button"
                onClick={() => addTextPreset(meme.label, 48, meme.color, meme.bg)}
                className="w-full p-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#F49342] flex items-center justify-between text-xs font-bold cursor-pointer"
              >
                <span>{meme.label}</span>
                <Plus className="h-4 w-4 text-[#8C9196]" />
              </button>
            ))}
          </div>
        )}

        {tab === 'transitions' && (
          <div className="space-y-2">
            <p className="text-[11px] text-[#8C9196]">
              {selectedClipId
                ? 'Apply an entry transition to the selected clip:'
                : 'Select a clip on the timeline first to apply a transition.'}
            </p>
            {TRANSITIONS.map((t) => (
              <button
                key={t.type}
                type="button"
                disabled={!selectedClipId}
                onClick={() =>
                  selectedClipId &&
                  updateClipTransition(selectedClipId, 'in', { type: t.type, durationMs: 500 })
                }
                className="w-full p-2.5 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] disabled:opacity-40 text-left text-xs font-medium cursor-pointer"
              >
                {t.label} (500ms)
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
