-- Boovy Phase 2: Social Connections, Publish Jobs & Tagged Asset Search RPC

-- 1. Social Connections (TikTok & Facebook)
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'facebook')),
  platform_account_id text not null,
  account_name text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_account_id)
);

create index if not exists idx_social_connections_user on public.social_connections (user_id);

alter table public.social_connections enable row level security;

create policy "Users can view own social connections"
  on public.social_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own social connections"
  on public.social_connections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own social connections"
  on public.social_connections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own social connections"
  on public.social_connections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger trg_social_connections_updated_at
  before update on public.social_connections
  for each row execute function public.set_updated_at();

-- 2. Publish Jobs
create table if not exists public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  connection_id uuid references public.social_connections (id) on delete set null,
  platform text not null check (platform in ('tiktok', 'facebook')),
  status text not null default 'queued' check (status in ('queued', 'uploading', 'published', 'failed')),
  caption text not null default '',
  hashtags text[] not null default '{}',
  export_bucket text not null default 'boovy-exports',
  export_path text not null,
  scheduled_for timestamptz,
  platform_post_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_publish_jobs_user_created on public.publish_jobs (user_id, created_at desc);

alter table public.publish_jobs enable row level security;

create policy "Users can view own publish jobs"
  on public.publish_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own publish jobs"
  on public.publish_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own publish jobs"
  on public.publish_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger trg_publish_jobs_updated_at
  before update on public.publish_jobs
  for each row execute function public.set_updated_at();

-- 3. Tagged Asset Search RPC
create or replace function public.search_boovy_assets(
  search_query text default '',
  filter_tags text[] default '{}',
  filter_kind text default null
)
returns table (
  id uuid,
  owner_id uuid,
  kind text,
  title text,
  description text,
  storage_provider text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  duration_ms integer,
  width integer,
  height integer,
  is_shared boolean,
  created_at timestamptz,
  tag_names text[]
)
language sql
stable
security invoker
as $$
  select
    a.id,
    a.owner_id,
    a.kind,
    a.title,
    a.description,
    a.storage_provider,
    a.storage_bucket,
    a.storage_path,
    a.mime_type,
    a.duration_ms,
    a.width,
    a.height,
    a.is_shared,
    a.created_at,
    coalesce(
      array_agg(distinct t.name) filter (where t.name is not null),
      '{}'::text[]
    ) as tag_names
  from public.assets a
  left join public.asset_tags at on at.asset_id = a.id
  left join public.tags t on t.id = at.tag_id
  where
    (a.owner_id = (select auth.uid()) or a.is_shared = true)
    and (filter_kind is null or filter_kind = '' or a.kind = filter_kind)
    and (
      search_query is null
      or search_query = ''
      or a.title ilike '%' || search_query || '%'
      or coalesce(a.description, '') ilike '%' || search_query || '%'
      or exists (
        select 1 from public.asset_tags at2
        join public.tags t2 on t2.id = at2.tag_id
        where at2.asset_id = a.id
          and (t2.name ilike '%' || search_query || '%' or t2.slug ilike '%' || search_query || '%')
      )
    )
    and (
      coalesce(array_length(filter_tags, 1), 0) = 0
      or exists (
        select 1 from public.asset_tags at3
        join public.tags t3 on t3.id = at3.tag_id
        where at3.asset_id = a.id
          and (t3.slug = any(filter_tags) or t3.name = any(filter_tags))
      )
    )
  group by a.id
  order by a.created_at desc
  limit 60;
$$;
