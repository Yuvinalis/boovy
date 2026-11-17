import { supabase } from '../supabase';
import { CloudflareR2Provider } from './CloudflareR2Provider';

export interface UploadResult {
  provider: 'supabase' | 'r2';
  bucket: string;
  path: string;
}

/**
 * StorageProvider abstracts media uploads and signed URLs so Boovy
 * can seamlessly swap from Supabase Storage (Phase 1-2) to Cloudflare R2 (Phase 3).
 */
export interface StorageProvider {
  uploadFile(bucket: string, path: string, file: Blob | File): Promise<UploadResult>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<void>;
}

class SupabaseStorageProvider implements StorageProvider {
  async uploadFile(bucket: string, path: string, file: Blob | File): Promise<UploadResult> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;
    return { provider: 'supabase', bucket, path };
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    if (bucket === 'boovy-shared-assets') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}

const useR2 = import.meta.env.VITE_STORAGE_PROVIDER === 'r2';
export const storageProvider: StorageProvider = useR2
  ? new CloudflareR2Provider()
  : new SupabaseStorageProvider();
