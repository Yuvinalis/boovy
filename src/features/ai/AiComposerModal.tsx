import { useState, type FormEvent } from 'react';
import { X, Sparkles, Wand2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type ProjectRecord,
} from '../../types/timeline';

interface AiComposerModalProps {
  onClose: () => void;
  onProjectCreated: (project: ProjectRecord) => void;
}

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Fast)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
];

export function AiComposerModal({ onClose, onProjectCreated }: AiComposerModalProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>('9:16');
  const [model, setModel] = useState(OPENROUTER_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ai-assemble-video', {
        body: {
          prompt: prompt.trim(),
          referenceUrl: referenceUrl.trim() || null,
          aspectRatio,
          model,
        },
      });

      if (fnErr || data?.error) {
        throw new Error(data?.error || fnErr?.message || 'AI assembly failed.');
      }

      if (data?.project) {
        onProjectCreated(data.project as ProjectRecord);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assemble video with AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xl max-w-lg w-full p-6 text-[#202223]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F1F8F5] text-[#008060]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Create with Boovy AI</h3>
              <p className="text-xs text-[#6D7175]">
                Powered by OpenRouter · Combines your tagged clips, memes & transitions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F6F6F7] text-[#6D7175] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Describe the video you want Boovy AI to assemble
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Fast-paced 15s gaming highlight with funny reaction memes, zoom-in transitions, and bold hook captions..."
              className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C6AC4]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reference Video URL (optional)
            </label>
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C6AC4]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6D7175] mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioKey)}
                className="w-full rounded-lg border border-[#C9CCCF] px-2.5 py-2 text-xs bg-white"
              >
                {Object.values(ASPECT_RATIO_PRESETS).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D7175] mb-1">
                OpenRouter Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-[#C9CCCF] px-2.5 py-2 text-xs bg-white"
              >
                {OPENROUTER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-lg border border-[#C9CCCF] text-sm font-medium hover:bg-[#F6F6F7] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="min-h-[40px] px-4 rounded-lg bg-[#008060] hover:bg-[#006E52] disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Wand2 className="h-4 w-4" />
              <span>{loading ? 'Assembling Timeline...' : 'Assemble & Open in Studio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
