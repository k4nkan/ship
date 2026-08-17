create extension if not exists pgcrypto with schema extensions;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  team text not null check (char_length(team) between 1 and 32),
  nickname text not null check (char_length(nickname) between 1 and 80),
  comment text not null check (char_length(comment) between 1 and 2000),
  image_path text not null,
  result_image_path text,
  gyan integer not null check (gyan >= 0),
  gyan_level text not null check (gyan_level in ('small', 'medium', 'large', 'huge')),
  ai_reaction text not null,
  facebook_text text not null,
  created_at timestamptz not null default now()
);

-- デバッグ用。backendで SUPABASE_TABLE_PREFIX=debug_ を設定すると使用します。
create table if not exists public.debug_posts (
  id uuid primary key default gen_random_uuid(),
  team text not null check (char_length(team) between 1 and 32),
  nickname text not null check (char_length(nickname) between 1 and 80),
  comment text not null check (char_length(comment) between 1 and 2000),
  image_path text not null,
  result_image_path text,
  gyan integer not null check (gyan >= 0),
  gyan_level text not null check (gyan_level in ('small', 'medium', 'large', 'huge')),
  ai_reaction text not null,
  facebook_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_team_idx
  on public.posts (team);

create index if not exists debug_posts_created_at_idx
  on public.debug_posts (created_at desc);

create index if not exists debug_posts_team_idx
  on public.debug_posts (team);

create table if not exists public.journey_state (
  id integer primary key default 1 check (id = 1),
  total_gyan integer not null default 0 check (total_gyan >= 0),
  progress numeric not null default 0 check (progress >= 0 and progress <= 1),
  speed integer not null default 8 check (speed >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.debug_journey_state (
  id integer primary key default 1 check (id = 1),
  total_gyan integer not null default 0 check (total_gyan >= 0),
  progress numeric not null default 0 check (progress >= 0 and progress <= 1),
  speed integer not null default 8 check (speed >= 0),
  updated_at timestamptz not null default now()
);

insert into public.journey_state (id, total_gyan, progress, speed)
values (1, 0, 0, 8)
on conflict (id) do nothing;

insert into public.debug_journey_state (id, total_gyan, progress, speed)
values (1, 0, 0, 8)
on conflict (id) do nothing;

update public.journey_state
set speed = 8
where id = 1 and speed = 0;

update public.debug_journey_state
set speed = 8
where id = 1 and speed = 0;

alter table public.posts enable row level security;
alter table public.debug_posts enable row level security;
alter table public.journey_state enable row level security;
alter table public.debug_journey_state enable row level security;

revoke all on public.posts from anon, authenticated;
revoke all on public.debug_posts from anon, authenticated;
revoke all on public.journey_state from anon, authenticated;
revoke all on public.debug_journey_state from anon, authenticated;

grant select, insert, update, delete on public.posts to service_role;
grant select, insert, update, delete on public.debug_posts to service_role;
grant select, insert, update on public.journey_state to service_role;
grant select, insert, update on public.debug_journey_state to service_role;
