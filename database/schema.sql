create extension if not exists pgcrypto with schema extensions;

create table if not exists public.adventure_posts (
  id uuid primary key default gen_random_uuid(),
  team text not null check (char_length(team) between 1 and 32),
  nickname text not null check (char_length(nickname) between 1 and 80),
  comment text not null check (char_length(comment) between 1 and 2000),
  photo_data_url text not null,
  gyan integer not null check (gyan >= 0),
  level text not null,
  reaction text not null,
  facebook_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists adventure_posts_created_at_idx
  on public.adventure_posts (created_at desc);

create index if not exists adventure_posts_team_idx
  on public.adventure_posts (team);

create or replace view public.adventure_post_summary as
select
  coalesce(sum(gyan), 0)::integer as total_gyan,
  count(*)::integer as post_count,
  max(created_at) as last_post_at
from public.adventure_posts;

alter table public.adventure_posts enable row level security;

revoke all on public.adventure_posts from anon, authenticated;
revoke all on public.adventure_post_summary from anon, authenticated;

grant select, insert, update, delete on public.adventure_posts to service_role;
grant select on public.adventure_post_summary to service_role;
