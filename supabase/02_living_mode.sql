-- Migration: add a second game mode for living people.
-- Adds a living_people table and extends games with a mode + optional
-- living_person_id column. Existing games remain valid (mode defaults
-- to 'historical').

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

alter table public.living_people enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'living_people' and policyname = 'Living people are public'
  ) then
    create policy "Living people are public" on public.living_people
      for select using (true);
  end if;
end $$;

-- Extend games table: add mode + living_person_id. surname_id becomes nullable
-- so a living-mode game can reference living_people instead.
alter table public.games
  add column if not exists mode text not null default 'historical';

alter table public.games
  add column if not exists living_person_id uuid references public.living_people(id) on delete cascade;

alter table public.games
  alter column surname_id drop not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'games_mode_check'
  ) then
    alter table public.games
      add constraint games_mode_check check (mode in ('historical', 'living'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'games_subject_check'
  ) then
    alter table public.games
      add constraint games_subject_check check (
        (mode = 'historical' and surname_id is not null and living_person_id is null)
        or (mode = 'living' and living_person_id is not null and surname_id is null)
      );
  end if;
end $$;

create index if not exists idx_games_living_person_id on public.games(living_person_id);
create index if not exists idx_games_mode on public.games(mode);
