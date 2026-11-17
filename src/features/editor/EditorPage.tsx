import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ProjectRecord } from '../../types/timeline';
import { useTimelineStore } from './store/useTimelineStore';
import { TopStudioBar } from './components/TopStudioBar';
import { AssetRail } from './components/AssetRail';
import { StageViewport } from './components/StageViewport';
import { InspectorPanel } from './components/InspectorPanel';
import { Timeline } from './components/Timeline';
import { MobileStudio } from './components/MobileStudio';
import { ExportModal } from './components/ExportModal';
import { PublishModal } from '../publish/PublishModal';

interface EditorPageProps {
  project: ProjectRecord;
  onBack: () => void;
}

export function EditorPage({ project, onBack }: EditorPageProps) {
  const { loadProject, projectTitle, aspectRatio, timeline, markSaved } = useTimelineStore();
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    loadProject(project.id, project.title, project.aspect_ratio, project.timeline_data);
  }, [project.id, loadProject, project.title, project.aspect_ratio, project.timeline_data]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        title: projectTitle,
        aspect_ratio: aspectRatio,
        timeline_data: timeline,
      })
      .eq('id', project.id);

    setSaving(false);
    if (!error) {
      markSaved();
    }
  };

  const handleShare = async () => {
    await supabase
      .from('projects')
      .update({ is_public: true })
      .eq('id', project.id);

    const shareUrl = `${window.location.origin}/?share=${project.id}`;
    await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0C0E] text-[#F1F2F4]">
      <TopStudioBar
        onBack={onBack}
        onSave={handleSave}
        onOpenExport={() => setShowExport(true)}
        onOpenPublish={() => setShowPublish(true)}
        onShare={handleShare}
        saving={saving}
        copiedShare={copiedShare}
      />

      {/* Desktop 4-Zone NLE (>= 1024px) */}
      <div className="hidden lg:flex flex-1 flex-col min-h-0">
        <div className="flex-1 flex min-h-0">
          <aside className="w-72 border-r border-[#262930] shrink-0 overflow-hidden">
            <AssetRail />
          </aside>

          <main className="flex-1 flex min-w-0 min-h-0">
            <StageViewport />
          </main>

          <aside className="w-72 border-l border-[#262930] shrink-0 overflow-hidden">
            <InspectorPanel />
          </aside>
        </div>

        <div className="h-60 shrink-0">
          <Timeline />
        </div>
      </div>

      {/* Mobile Touch-First Studio (< 1024px) */}
      <div className="flex lg:hidden flex-1 min-h-0">
        <MobileStudio />
      </div>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          onExported={(path) => setLastExportPath(path)}
          onOpenPublish={() => setShowPublish(true)}
        />
      )}

      {showPublish && (
        <PublishModal
          exportPath={lastExportPath}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
