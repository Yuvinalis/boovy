import { useState, type ChangeEvent, type FormEvent } from 'react';
import { X, Upload, Tag, Globe, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { storageProvider } from '../../lib/storage/StorageProvider';
import { useAuth } from '../auth/AuthContext';
import type { AssetRecord } from '../../types/timeline';

interface AssetVaultModalProps {
  onClose: () => void;
  onUploaded: (asset: AssetRecord) => void;
}

export function AssetVaultModal({ onClose, onUploaded }: AssetVaultModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'video' | 'meme' | 'image' | 'audio'>('video');
  const [tagsInput, setTagsInput] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
    if (selected.type.startsWith('audio/')) setKind('audio');
    else if (selected.type.startsWith('image/')) setKind('meme');
    else setKind('video');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const bucket = isShared ? 'boovy-shared-assets' : 'boovy-user-media';
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      await storageProvider.uploadFile(bucket, path, file);

      const { data: asset, error: insertErr } = await supabase
        .from('assets')
        .insert({
          owner_id: user.id,
          kind,
          title: title.trim() || file.name,
          description: description.trim() || null,
          storage_provider: 'supabase',
          storage_bucket: bucket,
          storage_path: path,
          mime_type: file.type,
          is_shared: isShared,
        })
        .select()
        .single();

      if (insertErr || !asset) throw insertErr ?? new Error('Failed to save asset');

      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      for (const tagName of parsedTags) {
        const slug = tagName.replace(/[^a-z0-9-]+/g, '-');
        const { data: tagRow } = await supabase
          .from('tags')
          .upsert({ name: tagName, slug, category: kind }, { onConflict: 'slug' })
          .select()
          .single();

        if (tagRow) {
          await supabase
            .from('asset_tags')
            .insert({ asset_id: asset.id, tag_id: tagRow.id });
        }
      }

      const signedUrl = await storageProvider.getSignedUrl(bucket, path);
      onUploaded({ ...(asset as AssetRecord), signedUrl, tag_names: parsedTags });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#14161A] border border-[#262930] rounded-xl max-w-md w-full p-6 text-[#F1F2F4] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Upload & Tag Asset</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1D2026] text-[#8C9196] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-950/50 border border-red-800 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block border border-dashed border-[#3E4450] hover:border-[#00A47C] rounded-lg p-4 text-center cursor-pointer bg-[#0B0C0E]">
            <input
              type="file"
              accept="video/*,image/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-5 w-5 mx-auto mb-1 text-[#00A47C]" />
            <div className="text-xs font-medium">
              {file ? file.name : 'Tap to choose video, meme, image, or SFX'}
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#8C9196] mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vine Boom"
                className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#8C9196] mb-1">Category</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
              >
                <option value="video">Video Clip</option>
                <option value="meme">Meme / Reaction</option>
                <option value="image">Image / Sticker</option>
                <option value="audio">Audio / SFX</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#8C9196] mb-1">
              Description (helps AI & search find this clip)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happens in this clip or meme..."
              className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] text-[#8C9196] mb-1">
              <Tag className="h-3 w-3" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="funny, reaction, zoom-in, sfx"
              className="w-full rounded-lg border border-[#262930] bg-[#0B0C0E] px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#5C6AC4]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsShared(!isShared)}
            className="w-full rounded-lg border border-[#262930] bg-[#1D2026] px-3 py-2 flex items-center justify-between text-xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {isShared ? (
                <Globe className="h-4 w-4 text-[#00A47C]" />
              ) : (
                <Lock className="h-4 w-4 text-[#8C9196]" />
              )}
              <span>{isShared ? 'Shared to Boovy Vault' : 'Private (Only You)'}</span>
            </span>
            <span className="text-[11px] text-[#8C9196]">Tap to toggle</span>
          </button>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
          >
            {uploading ? 'Uploading & Tagging...' : 'Save to Boovy Vault'}
          </button>
        </form>
      </div>
    </div>
  );
}
