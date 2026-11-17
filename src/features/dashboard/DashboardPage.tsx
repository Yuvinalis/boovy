import { useEffect, useState } from 'react';
import {
  Plus,
  Video,
  Trash2,
  Clock,
  LogOut,
  Smartphone,
  Monitor,
  Square,
  Film,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { BoovyLogo } from '../../components/BoovyLogo';
import { AiComposerModal } from '../ai/AiComposerModal';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type ProjectRecord,
} from '../../types/timeline';
import { createDefaultTimeline } from '../editor/engine/keyframes';

interface DashboardPageProps {
  onOpenProject: (project: ProjectRecord) => void;
}

export function DashboardPage({ onOpenProject }: DashboardPageProps) {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioKey>('9:16');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setProjects(data as ProjectRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!user) return;
    setCreating(true);
    const title = newTitle.trim() || 'Untitled Boovy Edit';
    const timeline = createDefaultTimeline(selectedRatio);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        aspect_ratio: selectedRatio,
        timeline_data: timeline,
      })
      .select()
      .single();

    setCreating(false);
    if (!error && data) {
      setShowCreateModal(false);
      setNewTitle('');
      onOpenProject(data as ProjectRecord);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const ratioIcon = (ratio: AspectRatioKey) => {
    switch (ratio) {
      case '9:16':
        return <Smartphone className="h-4 w-4" />;
      case '16:9':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F7] text-[#202223]">
      {/* Polaris Top Header */}
      <header className="bg-white border-b border-[#E1E3E5] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BoovyLogo />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E3F1DF] text-[#008060]">
              Studio
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline text-xs text-[#6D7175]">{user?.email}</span>
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg border border-[#5C6AC4] bg-[#5C6AC4]/10 hover:bg-[#5C6AC4]/20 text-[#5C6AC4] text-sm font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Boovy AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Video</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] text-[#202223] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quick Start Aspect Ratio Presets (Canva style) */}
        <section>
          <h2 className="text-sm font-semibold text-[#6D7175] uppercase tracking-wider mb-3">
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.values(ASPECT_RATIO_PRESETS).map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setSelectedRatio(preset.key);
                  setShowCreateModal(true);
                }}
                className="bg-white border border-[#E1E3E5] hover:border-[#008060] rounded-xl p-4 text-left transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-[#F1F8F5] text-[#008060] group-hover:bg-[#008060] group-hover:text-white transition-colors">
                    {ratioIcon(preset.key)}
                  </span>
                  <span className="text-xs font-mono text-[#6D7175]">
                    {preset.width}×{preset.height}
                  </span>
                </div>
                <div className="font-semibold text-sm text-[#202223]">{preset.label}</div>
                <div className="text-xs text-[#6D7175] mt-0.5">{preset.platformHint}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Projects Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#6D7175] uppercase tracking-wider">
              Your Boovy Projects ({projects.length})
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl bg-white border border-[#E1E3E5] animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E1E3E5] p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#F1F8F5] text-[#008060] flex items-center justify-center mb-3">
                <Film className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#202223]">No videos yet</h3>
              <p className="text-sm text-[#6D7175] mt-1 mb-5">
                Start your first edit with Boovy&apos;s multi-track timeline and keyframe studio.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-sm font-medium cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-[#E1E3E5] hover:border-[#5C6AC4] transition-all overflow-hidden shadow-2xs flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="h-36 bg-[#14161A] flex items-center justify-center relative group cursor-pointer w-full"
                  >
                    <Video className="h-10 w-10 text-[#8C9196] group-hover:text-[#00A47C] transition-colors" />
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-mono">
                      {project.aspect_ratio}
                    </span>
                  </button>

                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project)}
                        className="font-semibold text-sm text-[#202223] hover:text-[#008060] truncate block text-left cursor-pointer"
                      >
                        {project.title}
                      </button>
                      <div className="flex items-center gap-1 text-xs text-[#6D7175] mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project.id)}
                      title="Delete project"
                      className="p-2 rounded-lg text-[#6D7175] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[#202223]">New Boovy Project</h3>
            <p className="text-xs text-[#6D7175] mt-1">
              Choose a title and canvas aspect ratio. You can change this anytime in the studio.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Viral Meme Cut #1"
                  className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C6AC4]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(ASPECT_RATIO_PRESETS).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setSelectedRatio(preset.key)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        selectedRatio === preset.key
                          ? 'border-[#008060] bg-[#F1F8F5] text-[#008060] font-semibold'
                          : 'border-[#E1E3E5] text-[#202223] hover:bg-[#F6F6F7]'
                      }`}
                    >
                      <div>{preset.label}</div>
                      <div className="text-[11px] opacity-75">{preset.platformHint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[40px] px-4 rounded-lg border border-[#C9CCCF] text-sm font-medium text-[#202223] hover:bg-[#F6F6F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateProject}
                className="min-h-[40px] px-4 rounded-lg bg-[#008060] hover:bg-[#006E52] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Open in Studio'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAiModal && (
        <AiComposerModal
          onClose={() => setShowAiModal(false)}
          onProjectCreated={(project) => onOpenProject(project)}
        />
      )}
    </div>
  );
}
