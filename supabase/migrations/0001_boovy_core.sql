-- Boovy Phase 1 Core Schema, RLS Policies, Triggers & Storage Buckets
-- Postgres 17 / Supabase

-- 1. Extensions
create extension if not exists pgcrypto;

-- 2. Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Profiles can be inserted by owner"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Profiles can be updated by owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled Boovy Edit',
  aspect_ratio text not null default '9:16',
  thumbnail_url text,
  timeline_data jsonb not null default '{"version":1,"fps":30,"resolution":{"width":1080,"height":1920},"durationMs":15000,"tracks":[]}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_updated on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

create policy "Users can view own or public projects"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id or is_public = true);

create policy "Users can insert own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 5. Assets table (videos, images, memes, audio, transitions, effects)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('video', 'image', 'meme', 'audio', 'transition', 'effect')),
  title text not null,
  description text,
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 'r2')),
  storage_bucket text not null default 'boovy-user-media',
  storage_path text not null,
  mime_type text,
  duration_ms integer,
  width integer,
  height integer,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_owner_created on public.assets (owner_id, created_at desc);
create index if not exists idx_assets_kind_shared on public.assets (kind, is_shared);

alter table public.assets enable row level security;

create policy "Users can view own or shared assets"
  on public.assets for select
  to authenticated
  using ((select auth.uid()) = owner_id or is_shared = true);

create policy "Users can insert own assets"
  on public.assets for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update own assets"
  on public.assets for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete own assets"
  on public.assets for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- 6. Tags & Asset Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

create policy "Tags are readable by authenticated users"
  on public.tags for select
  to authenticated
  using (true);

create policy "Authenticated users can create tags"
  on public.tags for insert
  to authenticated
  with check (true);

create table if not exists public.asset_tags (
  asset_id uuid not null references public.assets (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (asset_id, tag_id)
);

create index if not exists idx_asset_tags_tag_id on public.asset_tags (tag_id);

alter table public.asset_tags enable row level security;

create policy "Asset tags are readable if asset is accessible"
  on public.asset_tags for select
  to authenticated
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id
        and (a.owner_id = (select auth.uid()) or a.is_shared = true)
    )
  );

create policy "Users can tag their own assets"
  on public.asset_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_id
        and a.owner_id = (select auth.uid())
    )
  );

create policy "Users can untag their own assets"
  on public.asset_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id
        and a.owner_id = (select auth.uid())
    )
  );

-- 7. Storage Buckets & Policies
insert into storage.buckets (id, name, public)
values
  ('boovy-user-media', 'boovy-user-media', false),
  ('boovy-shared-assets', 'boovy-shared-assets', true),
  ('boovy-exports', 'boovy-exports', false)
on conflict (id) do nothing;

-- User media: scoped to folder <uid>/...
create policy "Users can read own user-media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'boovy-user-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own user-media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'boovy-user-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own user-media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'boovy-user-media'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Shared assets: readable by authenticated/public, uploadable by authenticated into <uid>/...
create policy "Anyone can read shared assets"
  on storage.objects for select
  to public
  using (bucket_id = 'boovy-shared-assets');

create policy "Users can upload shared assets to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'boovy-shared-assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Exports: scoped to folder <uid>/...
create policy "Users can read own exports"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'boovy-exports'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own exports"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'boovy-exports'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own exports"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'boovy-exports'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
