# Boovy — Unified Web Video Studio

**Boovy** is a responsive, browser-based video editing platform built with React, TypeScript, Tailwind CSS, Supabase, and Firebase Hosting. It unifies **Canva-style** speed and aspect-ratio templates, **CapCut-style** magnetic multi-track editing and viral meme overlays, and **Adobe After Effects-style** keyframe animation, easing curves, blend modes, and color/filter stacks in a **Shopify Polaris-inspired** UI.

---

## Key Features

### Phase 1 — Core Unified Studio & Multi-User Foundation
- **Shopify Polaris-Inspired Design System**:
  - **Light Polaris Dashboard** for browsing projects, aspect-ratio starter templates (`9:16`, `16:9`, `1:1`, `4:5`), and AI creation.
  - **Dark Studio Editor** with **Desktop 4-Zone NLE** (`>= 1024px`) and **Mobile Touch-First Studio** (`< 1024px`, `44px+` touch targets, sticky preview, scrubbable timeline, and slide-up tool drawers).
- **Canva + CapCut + After Effects Engine**:
  - Multi-track timeline (`Text & Captions`, `Memes & Overlays`, `Main Video`, `Audio & SFX`) with Undo/Redo history, clip drag/trim, split at playhead, and ripple delete.
  - Keyframe animation (`x`, `y`, `scale`, `rotation`, `opacity`) with easing curves (`linear`, `ease-in`, `ease-out`, `ease-in-out`).
  - Layer blend modes, color/filter sliders (`brightness`, `contrast`, `saturate`, `blur`), playback speed control, and transitions (`fade`, `slide-left`, `slide-up`, `zoom-in`, `wipe-right`).
- **Multi-Threaded Browser MP4 Export**:
  - Powered by `@ffmpeg/ffmpeg` (`@ffmpeg/core-mt` when `crossOriginIsolated` is active via `COOP`/`COEP` headers in `vite.config.ts` and `firebase.json`), uploading rendered `.mp4` files to `boovy-exports`.
- **Supabase Auth, Postgres & Storage**:
  - Row-Level Security (RLS) isolating each user's projects and media (`profiles`, `projects`, `assets`, `tags`, `asset_tags`).

### Phase 2 — Tagged Meme/Asset Vault, Sharing & Social Auto-Posting
- **Tagged Asset & Meme Vault** (`src/features/library/AssetVaultModal.tsx` & `search_boovy_assets` RPC):
  - Upload videos, memes, images, or SFX with descriptions, community sharing toggles, and `#tag` chips.
  - Search by title, description, or tag inside the editor.
- **Share & Remix in Boovy**:
  - Share any project via `/?share=<project_id>`; other logged-in users can click **Remix in Boovy** to clone the timeline into their own workspace.
- **Direct TikTok & Facebook Auto-Posting**:
  - `social-oauth` & `publish-video` Supabase Edge Functions (`social_connections` & `publish_jobs` tables) + `PublishModal.tsx` to connect TikTok/Meta accounts, write captions/hashtags, schedule posts, and publish exported MP4s.

### Phase 3 — OpenRouter AI Video Assembler & Cloudflare R2 Readiness
- **Create with Boovy AI** (`src/features/ai/AiComposerModal.tsx` & `ai-assemble-video` Edge Function):
  - Uses **OpenRouter** (`google/gemini-2.0-flash-001`, `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`) + `pgvector`-indexed `assets` (`0003_ai_vectors.sql`) to assemble a complete editable `BoovyTimeline` from a prompt and optional reference video URL.
  - Opens the AI-generated cut directly in the Boovy Studio Editor for manual tweaking and export.
- **Cloudflare R2 Storage Adapter** (`src/lib/storage/CloudflareR2Provider.ts` & `r2-presign` Edge Function):
  - Drop-in `StorageProvider` swap from Supabase Storage to Cloudflare R2 by setting `VITE_STORAGE_PROVIDER=r2` and configuring R2 Edge Function secrets.

---

## Project Structure

```text
├── firebase.json                     # Firebase Hosting (boovy-app) + COOP/COEP headers
├── vite.config.ts                    # Vite + Tailwind v4 + COOP/COEP dev/preview headers
├── supabase/
│   ├── migrations/
│   │   ├── 0001_boovy_core.sql       # Profiles, projects, assets, tags, RLS & storage buckets
│   │   ├── 0002_social_publishing.sql# Social connections, publish jobs & search_boovy_assets RPC
│   │   └── 0003_ai_vectors.sql       # pgvector embeddings & ai_generations history
│   └── functions/
│       ├── social-oauth/             # TikTok & Facebook OAuth 2.0 handler
│       ├── publish-video/            # TikTok & Facebook video publisher
│       ├── ai-assemble-video/        # OpenRouter AI timeline assembler
│       └── r2-presign/               # Cloudflare R2 presigned URL generator
└── src/
    ├── lib/
    │   ├── supabase.ts
    │   └── storage/                  # StorageProvider (Supabase + Cloudflare R2)
    ├── features/
    │   ├── auth/                     # Supabase AuthContext & AuthPage
    │   ├── dashboard/                # Light Polaris DashboardPage
    │   ├── ai/                       # AiComposerModal (OpenRouter)
    │   ├── library/                  # AssetVaultModal (Upload & Tag)
    │   ├── publish/                  # PublishModal (TikTok & Facebook)
    │   └── editor/                   # Studio UI, Zustand store, Compositor & FFmpeg Exporter
    └── types/timeline.ts             # Unified BoovyTimeline & database types
```

---

## Local Development & Verification

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run unit tests:
   ```bash
   npm run test
   ```
4. Start the dev server (with `COOP`/`COEP` headers enabled):
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

## Deployment

- **Firebase Hosting**:
  ```bash
  npm run build
  firebase deploy --only hosting
  ```
- **Supabase Edge Function Secrets** (for Phase 2/3 server-side features):
  - `OPENROUTER_API_KEY` (for `ai-assemble-video`)
  - `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET` (for `social-oauth` & `publish-video`)
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (for `r2-presign`)
