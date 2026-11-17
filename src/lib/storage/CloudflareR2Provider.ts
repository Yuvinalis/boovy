import { supabase } from '../supabase';
import type { StorageProvider, UploadResult } from './StorageProvider';

/**
 * Phase 3 Cloudflare R2 storage adapter using the `r2-presign` Supabase Edge Function.
 * Activate by setting VITE_STORAGE_PROVIDER=r2 once Cloudflare R2 secrets are configured.
 */
export class CloudflareR2Provider implements StorageProvider {
  async uploadFile(bucket: string, path: string, file: Blob | File): Promise<UploadResult> {
    const key = `${bucket}/${path}`;
    const { data, error } = await supabase.functions.invoke('r2-presign', {
      body: {
        action: 'upload',
        path: key,
        contentType: file.type || 'application/octet-stream',
      },
    });
    if (error || !data?.url) throw error ?? new Error('Failed to presign R2 upload');

    const res = await fetch(data.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error(`R2 upload failed with status ${res.status}`);

    return { provider: 'r2', bucket, path };
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const key = `${bucket}/${path}`;
    const { data, error } = await supabase.functions.invoke('r2-presign', {
      body: { action: 'download', path: key, expiresIn: expiresInSeconds },
    });
    if (error || !data?.url) throw error ?? new Error('Failed to presign R2 download');
    return data.url;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const key = `${bucket}/${path}`;
    const { data, error } = await supabase.functions.invoke('r2-presign', {
      body: { action: 'delete', path: key },
    });
    if (error || !data?.url) throw error ?? new Error('Failed to presign R2 delete');
    await fetch(data.url, { method: 'DELETE' });
  }
}
