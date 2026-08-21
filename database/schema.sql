-- Ship team currency MVP schema.
-- Supabase SQL Editorでこのファイル全体を1回実行する。
-- 既存の投稿データやStorage bucketは削除しない。

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.teams (
  id text primary key check (char_length(id) between 1 and 16),
  name text not null check (char_length(name) between 1 and 32),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default '🚢',
  created_at timestamptz not null default now()
);

create table if not exists public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  amount integer not null check (amount <> 0),
  created_at timestamptz not null default now()
);

create index if not exists currency_transactions_team_created_at_idx
  on public.currency_transactions (team_id, created_at desc);

create table if not exists public.race_state (
  id integer primary key default 1 check (id = 1),
  is_running boolean not null default false,
  elapsed_seconds numeric not null default 0 check (elapsed_seconds >= 0),
  updated_at timestamptz not null default now()
);

insert into public.race_state (id, is_running, elapsed_seconds)
values (1, false, 0)
on conflict (id) do nothing;

insert into public.teams (id, name, color, icon)
values
  ('A', 'A班', '#8b5cf6', '🚢'),
  ('B', 'B班', '#2563eb', '🚢'),
  ('C', 'C班', '#eab308', '🚢'),
  ('D', 'D班', '#ef4444', '🚢'),
  ('E', 'E班', '#f97316', '🚢'),
  ('F', 'F班', '#14b8a6', '🚢')
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon;

-- Cloud Run uses SUPABASE_TABLE_PREFIX=debug_ during verification.
create table if not exists public.debug_teams (
  id text primary key check (char_length(id) between 1 and 16),
  name text not null check (char_length(name) between 1 and 32),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default '🚢',
  created_at timestamptz not null default now()
);

create table if not exists public.debug_currency_transactions (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.debug_teams(id) on delete cascade,
  amount integer not null check (amount <> 0),
  created_at timestamptz not null default now()
);

create index if not exists debug_currency_transactions_team_created_at_idx
  on public.debug_currency_transactions (team_id, created_at desc);

create table if not exists public.debug_race_state (
  id integer primary key default 1 check (id = 1),
  is_running boolean not null default false,
  elapsed_seconds numeric not null default 0 check (elapsed_seconds >= 0),
  updated_at timestamptz not null default now()
);

insert into public.debug_race_state (id, is_running, elapsed_seconds)
values (1, false, 0)
on conflict (id) do nothing;

insert into public.debug_teams (id, name, color, icon)
values
  ('A', 'A班', '#8b5cf6', '🚢'),
  ('B', 'B班', '#2563eb', '🚢'),
  ('C', 'C班', '#eab308', '🚢'),
  ('D', 'D班', '#ef4444', '🚢'),
  ('E', 'E班', '#f97316', '🚢'),
  ('F', 'F班', '#14b8a6', '🚢')
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon;

alter table public.teams enable row level security;
alter table public.currency_transactions enable row level security;
alter table public.race_state enable row level security;
alter table public.debug_teams enable row level security;
alter table public.debug_currency_transactions enable row level security;
alter table public.debug_race_state enable row level security;

revoke all on public.teams from anon, authenticated;
revoke all on public.currency_transactions from anon, authenticated;
revoke all on public.race_state from anon, authenticated;
revoke all on public.debug_teams from anon, authenticated;
revoke all on public.debug_currency_transactions from anon, authenticated;
revoke all on public.debug_race_state from anon, authenticated;

grant select on public.teams to service_role;
grant select, insert on public.currency_transactions to service_role;
grant select, update, insert on public.race_state to service_role;
grant select on public.debug_teams to service_role;
grant select, insert on public.debug_currency_transactions to service_role;
grant select, update, insert on public.debug_race_state to service_role;
