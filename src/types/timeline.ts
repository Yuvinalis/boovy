export type AspectRatioKey = '9:16' | '16:9' | '1:1' | '4:5';

export interface AspectRatioPreset {
  key: AspectRatioKey;
  label: string;
  platformHint: string;
  width: number;
  height: number;
}

export const ASPECT_RATIO_PRESETS: Record<AspectRatioKey, AspectRatioPreset> = {
  '9:16': { key: '9:16', label: '9:16 Vertical', platformHint: 'TikTok / Reels / Shorts', width: 1080, height: 1920 },
  '16:9': { key: '16:9', label: '16:9 Widescreen', platformHint: 'YouTube / Web', width: 1920, height: 1080 },
  '1:1': { key: '1:1', label: '1:1 Square', platformHint: 'Instagram / Feed', width: 1080, height: 1080 },
  '4:5': { key: '4:5', label: '4:5 Portrait', platformHint: 'Facebook / IG Feed', width: 1080, height: 1350 },
};

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe<T = number> {
  id: string;
  timeMs: number; // Relative to clip start
  value: T;
  easing: EasingType;
}

export type KeyframeProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

export interface ClipKeyframes {
  x: Keyframe<number>[];
  y: Keyframe<number>[];
  scale: Keyframe<number>[];
  rotation: Keyframe<number>[];
  opacity: Keyframe<number>[];
}

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'zoom-in' | 'wipe-right';

export interface TransitionRef {
  type: TransitionType;
  durationMs: number;
}

export interface ClipFilters {
  brightness: number; // 0 to 200, default 100
  contrast: number;   // 0 to 200, default 100
  saturate: number;   // 0 to 200, default 100
  blur: number;       // 0 to 20px, default 0
  grayscale: number;  // 0 to 100, default 0
}

export interface TextClipStyle {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  fontWeight: '400' | '600' | '700' | '800';
  align: 'left' | 'center' | 'right';
}

export type ClipKind = 'video' | 'image' | 'meme' | 'text' | 'audio';
export type TrackKind = 'video' | 'overlay' | 'text' | 'audio';

export interface Clip {
  id: string;
  assetId?: string;
  sourceUrl?: string;
  name: string;
  type: ClipKind;
  startMs: number;
  durationMs: number;
  sourceStartMs: number;
  speed: number;
  volume: number; // 0 to 1
  blendMode: GlobalCompositeOperation;
  keyframes: ClipKeyframes;
  filters: ClipFilters;
  transitionIn: TransitionRef;
  transitionOut: TransitionRef;
  textStyle?: TextClipStyle;
}

export interface Track {
  id: string;
  type: TrackKind;
  name: string;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  clips: Clip[];
}

export interface BoovyTimeline {
  version: 1;
  fps: 30 | 60;
  resolution: { width: number; height: number };
  durationMs: number;
  tracks: Track[];
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  aspect_ratio: AspectRatioKey;
  thumbnail_url: string | null;
  timeline_data: BoovyTimeline;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetRecord {
  id: string;
  owner_id: string;
  kind: 'video' | 'image' | 'meme' | 'audio' | 'transition' | 'effect';
  title: string;
  description: string | null;
  storage_provider: 'supabase' | 'r2';
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  is_shared: boolean;
  created_at: string;
  signedUrl?: string;
  tag_names?: string[];
}

export type SocialPlatform = 'tiktok' | 'facebook';

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  platform_account_id: string;
  account_name: string;
  expires_at: string | null;
  created_at: string;
}

export interface PublishJob {
  id: string;
  user_id: string;
  project_id: string | null;
  connection_id: string | null;
  platform: SocialPlatform;
  status: 'queued' | 'uploading' | 'published' | 'failed';
  caption: string;
  hashtags: string[];
  export_bucket: string;
  export_path: string;
  scheduled_for: string | null;
  platform_post_id: string | null;
  error_message: string | null;
  created_at: string;
}
