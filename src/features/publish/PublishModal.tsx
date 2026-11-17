import { useEffect, useState, type FormEvent } from 'react';
import { X, Send, Link2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTimelineStore } from '../editor/store/useTimelineStore';
import type { PublishJob, SocialConnection, SocialPlatform } from '../../types/timeline';

interface PublishModalProps {
  exportPath?: string | null;
  onClose: () => void;
}

export function PublishModal({ exportPath, onClose }: PublishModalProps) {
  const { user } = useAuth();
  const { projectId, projectTitle } = useTimelineStore();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [caption, setCaption] = useState(projectTitle);
  const [hashtags, setHashtags] = useState('boovy, videoedit, viral');
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    const [{ data: conns }, { data: recentJobs }] = await Promise.all([
      supabase.from('social_connections').select('*').order('created_at', { ascending: false }),
      supabase.from('publish_jobs').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    if (conns) {
      setConnections(conns as SocialConnection[]);
      if (conns.length > 0 && !selectedConnId) setSelectedConnId(conns[0].id);
    }
    if (recentJobs) setJobs(recentJobs as PublishJob[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async (platform: SocialPlatform) => {
    setNotice(null);
    const { data, error } = await supabase.functions.invoke('social-oauth', {
      body: {
        action: 'get_auth_url',
        platform,
        redirectUri: `${window.location.origin}/?oauth=${platform}`,
      },
    });

    if (error || data?.error) {
      setNotice({
        type: 'error',
        text:
          data?.error ||
          error?.message ||
          `Configure ${platform.toUpperCase()} developer keys in Supabase Edge Function secrets to enable OAuth.`,
      });
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConnId || !exportPath) return;

    const conn = connections.find((c) => c.id === selectedConnId);
    if (!conn) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const parsedTags = hashtags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const { data: job, error: jobErr } = await supabase
        .from('publish_jobs')
        .insert({
          user_id: user.id,
          project_id: projectId,
          connection_id: conn.id,
          platform: conn.platform,
          status: 'queued',
          caption,
          hashtags: parsedTags,
          export_bucket: 'boovy-exports',
          export_path: exportPath,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        })
        .select()
        .single();

      if (jobErr || !job) throw jobErr ?? new Error('Failed to create publish job');

      if (!scheduledFor) {
        await supabase.functions.invoke('publish-video', { body: { jobId: job.id } });
      }

      setNotice({
        type: 'info',
        text: scheduledFor
          ? `Scheduled for ${conn.account_name}!`
          : `Publishing to ${conn.account_name}...`,
      });
      await loadData();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Auto-post failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#14161A] border border-[#262930] rounded-xl max-w-lg w-full p-6 text-[#F1F2F4] shadow-2xl max-h-[90vh] overflow-y-auto studio-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Auto-Post to TikTok & Facebook</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1D2026] text-[#8C9196] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Connect Social Accounts */}
        <div className="mb-4 p-3 rounded-lg bg-[#0B0C0E] border border-[#262930] space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
            Connected Accounts ({connections.length})
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleConnect('tiktok')}
              className="h-9 px-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#00A47C] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5 text-[#00A47C]" />
              <span>Connect TikTok</span>
            </button>
            <button
              type="button"
              onClick={() => handleConnect('facebook')}
              className="h-9 px-3 rounded-lg border border-[#262930] bg-[#1D2026] hover:border-[#5C6AC4] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5 text-[#5C6AC4]" />
              <span>Connect Facebook</span>
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-lg p-3 text-xs flex items-start gap-2 border ${
              notice.type === 'error'
                ? 'bg-red-950/50 border-red-800 text-red-200'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-3.5">
          <div>
            <label className="block text-[11px] text-[#8C9196] mb-1">Target Account</label>
            <select
              value={selectedConnId}
              onChange={(e) => setSelectedConnId(e.target.value)}
              disabled={connections.length === 0}
              className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-3 py-2 text-xs"
            >
              {connections.length === 0 ? (
                <option value="">No connected TikTok / Facebook account yet</option>
              ) : (
                connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.platform.toUpperCase()} — {c.account_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[#8C9196] mb-1">Caption</label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-3 py-2 text-xs focus:outline-none focus:border-[#5C6AC4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#8C9196] mb-1">Hashtags</label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] text-[#8C9196] mb-1">
                <Calendar className="h-3 w-3" />
                <span>Schedule (optional)</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          {!exportPath && (
            <div className="text-[11px] text-[#F49342]">
              Export your video to MP4 first so Boovy has a rendered file ready to post.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedConnId || !exportPath}
            className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Submitting...' : scheduledFor ? 'Schedule Auto-Post' : 'Publish Now'}</span>
          </button>
        </form>

        {jobs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#262930] space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C9196]">
              Recent Publish Jobs
            </div>
            {jobs.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between text-xs bg-[#0B0C0E] border border-[#262930] rounded-lg px-3 py-2"
              >
                <span className="truncate max-w-[60%]">
                  {j.platform.toUpperCase()} · {j.caption || 'Untitled'}
                </span>
                <span className="font-mono text-[11px] text-[#00A47C] uppercase">{j.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
