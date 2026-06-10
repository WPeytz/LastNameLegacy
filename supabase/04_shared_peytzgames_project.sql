-- Migration: move LastNameLegacy onto the shared PeytzGames Supabase project
-- (wpeoyrrstzioluzhfdfx). The shared project already has:
--   public.profiles (id, username unique not null, created_at) + signup trigger
--   public.scores (PeytzGames arcade leaderboard)
-- This migration adds the LastNameLegacy tables on top, and extends profiles
-- with the game stats columns. The app now identifies players by `username`
-- (3-20 chars, letters/digits/underscore) instead of `display_name`.

create extension if not exists "uuid-ossp";

-- Extend the shared profiles table with LastNameLegacy stats
alter table public.profiles
  add column if not exists total_games int not null default 0,
  add column if not exists total_score numeric(10,2) not null default 0;

-- Surnames table: curated list of unambiguous famous last names
create table if not exists public.surnames (
  id uuid primary key default uuid_generate_v4(),
  surname text not null unique,
  canonical_first_name text not null,
  canonical_full_name text not null,
  country text not null,
  profession text not null,
  era text not null,
  hint text,
  created_at timestamptz default now()
);

-- Living people table: second game mode
create table if not exists public.living_people (
  id uuid primary key default uuid_generate_v4(),
  surname text not null unique,
  canonical_first_name text not null,
  canonical_full_name text not null,
  country text not null,
  profession text not null,
  era text not null,
  hint text,
  created_at timestamptz default now()
);

create index if not exists idx_living_people_surname on public.living_people(surname);

-- Games table: one row per play session
create table if not exists public.games (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null default 'historical',
  surname_id uuid references public.surnames(id) on delete cascade,
  living_person_id uuid references public.living_people(id) on delete cascade,
  answer_text text not null,
  total_score numeric(10,2) not null,
  scores jsonb not null,
  created_at timestamptz default now(),
  constraint games_mode_check check (mode in ('historical', 'living')),
  constraint games_subject_check check (
    (mode = 'historical' and surname_id is not null and living_person_id is null)
    or (mode = 'living' and living_person_id is not null and surname_id is null)
  )
);

create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_games_surname_id on public.games(surname_id);
create index if not exists idx_games_living_person_id on public.games(living_person_id);
create index if not exists idx_games_mode on public.games(mode);
create index if not exists idx_games_total_score on public.games(total_score desc);

-- RLS
alter table public.surnames enable row level security;
alter table public.living_people enable row level security;
alter table public.games enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'surnames' and policyname = 'Surnames are public') then
    create policy "Surnames are public" on public.surnames for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'living_people' and policyname = 'Living people are public') then
    create policy "Living people are public" on public.living_people for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'games' and policyname = 'Games are public') then
    create policy "Games are public" on public.games for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'games' and policyname = 'Users can insert own games') then
    create policy "Users can insert own games" on public.games for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Allow a signed-in user to delete their own auth.users row.
-- NOTE: in the shared project this deletes the whole PeytzGames account
-- (profile, arcade scores, and game history) — by design for shared accounts.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
