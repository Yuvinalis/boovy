import { ArrowLeft, Undo2, Redo2, Save, Download, Check, Share2, Send } from 'lucide-react';
import { BoovyLogo } from '../../../components/BoovyLogo';
import { useTimelineStore } from '../store/useTimelineStore';
import { ASPECT_RATIO_PRESETS, type AspectRatioKey } from '../../../types/timeline';

interface TopStudioBarProps {
  onBack: () => void;
  onSave: () => Promise<void>;
  onOpenExport: () => void;
  onOpenPublish: () => void;
  onShare: () => Promise<void>;
  saving: boolean;
  copiedShare?: boolean;
}

export function TopStudioBar({
  onBack,
  onSave,
  onOpenExport,
  onOpenPublish,
  onShare,
  saving,
  copiedShare,
}: TopStudioBarProps) {
  const {
    projectTitle,
    setProjectTitle,
    aspectRatio,
    setAspectRatio,
    isDirty,
    undo,
    redo,
    historyPast,
    historyFuture,
  } = useTimelineStore();

  return (
    <header className="h-14 bg-[#14161A] border-b border-[#262930] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          title="Back to Dashboard"
          className="h-9 w-9 rounded-lg border border-[#262930] bg-[#1D2026] hover:bg-[#262930] text-[#F1F2F4] flex items-center justify-center shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="hidden md:block">
          <BoovyLogo dark size="sm" />
        </div>

        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          aria-label="Project title"
          className="bg-transparent border border-transparent hover:border-[#262930] focus:border-[#5C6AC4] focus:bg-[#0B0C0E] rounded-md px-2 py-1 text-sm font-medium text-[#F1F2F4] focus:outline-none min-w-0 w-32 sm:w-48 truncate"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:flex items-center gap-1 mr-1">
          <button
            type="button"
            onClick={undo}
            disabled={historyPast.length === 0}
            title="Undo"
            className="h-9 w-9 rounded-lg border border-[#262930] bg-[#1D2026] hover:bg-[#262930] disabled:opacity-35 text-[#F1F2F4] flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyFuture.length === 0}
            title="Redo"
            className="h-9 w-9 rounded-lg border border-[#262930] bg-[#1D2026] hover:bg-[#262930] disabled:opacity-35 text-[#F1F2F4] flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatioKey)}
          aria-label="Canvas aspect ratio"
          className="h-9 rounded-lg border border-[#262930] bg-[#1D2026] text-[#F1F2F4] text-xs font-mono px-2 focus:outline-none focus:border-[#5C6AC4] cursor-pointer"
        >
          {Object.values(ASPECT_RATIO_PRESETS).map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.key}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-9 px-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:bg-[#262930] text-[#F1F2F4] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
        >
          {saving ? (
            <span>Saving...</span>
          ) : isDirty ? (
            <>
              <Save className="h-3.5 w-3.5 text-[#F49342]" />
              <span className="hidden sm:inline">Save</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-[#00A47C]" />
              <span className="hidden sm:inline">Saved</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onShare}
          title="Copy shareable Boovy link"
          className="h-9 px-2.5 rounded-lg border border-[#262930] bg-[#1D2026] hover:bg-[#262930] text-[#F1F2F4] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
        >
          {copiedShare ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#00A47C]" />
              <span className="hidden md:inline">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Share</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenPublish}
          title="Auto-Post to TikTok / Facebook"
          className="h-9 px-2.5 sm:px-3 rounded-lg border border-[#5C6AC4]/60 bg-[#5C6AC4]/20 hover:bg-[#5C6AC4]/30 text-[#F1F2F4] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5 text-[#8B97E8]" />
          <span className="hidden sm:inline">Publish</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="h-9 px-3 sm:px-4 rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
