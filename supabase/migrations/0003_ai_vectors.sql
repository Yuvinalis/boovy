-- Boovy Phase 3: pgvector Semantic Asset Indexing & AI Generation History

create extension if not exists vector;

alter table public.assets
  add column if not exists embedding vector(1536);

create index if not exists idx_assets_embedding_cosine
  on public.assets using hnsw (embedding vector_cosine_ops);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  prompt text not null,
  reference_url text,
  model text not null default 'openai/gpt-4o-mini',
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generations_user_created
  on public.ai_generations (user_id, created_at desc);

alter table public.ai_generations enable row level security;

create policy "Users can view own AI generations"
  on public.ai_generations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own AI generations"
  on public.ai_generations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
