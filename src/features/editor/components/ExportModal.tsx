import { useState } from 'react';
import { X, Download, CloudUpload, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { useTimelineStore } from '../store/useTimelineStore';
import { exportTimelineToMp4 } from '../engine/Exporter';
import { storageProvider } from '../../../lib/storage/StorageProvider';
import { useAuth } from '../../auth/AuthContext';

interface ExportModalProps {
  onClose: () => void;
  onExported?: (exportPath: string) => void;
  onOpenPublish?: () => void;
}

export function ExportModal({ onClose, onExported, onOpenPublish }: ExportModalProps) {
  const { user } = useAuth();
  const { timeline, projectTitle } = useTimelineStore();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Ready to render MP4');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setDownloadUrl(null);
    setSavedToCloud(false);

    try {
      const mp4Blob = await exportTimelineToMp4({
        timeline,
        onProgress: (pct, msg) => {
          setProgress(pct);
          setStage(msg);
        },
      });

      const localUrl = URL.createObjectURL(mp4Blob);
      setDownloadUrl(localUrl);

      if (user) {
        setStage('Uploading export to Boovy Cloud...');
        const safeName = projectTitle.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'boovy_video';
        const path = `${user.id}/${Date.now()}_${safeName}.mp4`;
        await storageProvider.uploadFile('boovy-exports', path, mp4Blob);
        setSavedToCloud(true);
        setStage('Exported & saved to Boovy Cloud!');
        onExported?.(path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#14161A] border border-[#262930] rounded-xl max-w-md w-full p-6 text-[#F1F2F4] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Export Video</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1D2026] text-[#8C9196] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-[#0B0C0E] border border-[#262930] p-3.5 text-xs space-y-1.5 mb-4">
          <div className="flex justify-between">
            <span className="text-[#8C9196]">Resolution</span>
            <span className="font-mono">
              {timeline.resolution.width}×{timeline.resolution.height}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C9196]">Frame Rate</span>
            <span className="font-mono">{timeline.fps} fps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C9196]">Threading</span>
            <span className="font-mono text-[#00A47C]">
              {typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated
                ? 'Multi-threaded (COOP/COEP)'
                : 'Standard'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800 p-3 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {(exporting || progress > 0) && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#8C9196]">{stage}</span>
              <span className="font-mono text-[#00A47C]">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#262930] overflow-hidden">
              <div
                className="h-full bg-[#00A47C] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {savedToCloud && (
          <div className="mb-4 text-xs text-[#00A47C] flex items-center gap-1.5">
            <CloudUpload className="h-4 w-4" />
            <span>Saved to your Boovy Cloud exports bucket.</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {downloadUrl ? (
            <>
              <a
                href={downloadUrl}
                download={`${projectTitle || 'boovy_export'}.mp4`}
                className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Download MP4</span>
              </a>
              {onOpenPublish && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPublish();
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-[#5C6AC4] bg-[#5C6AC4]/20 hover:bg-[#5C6AC4]/30 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Auto-Post to TikTok / Facebook</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? 'Rendering MP4...' : 'Start MP4 Render'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
