-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Surnames table: curated list of unambiguous famous last names
create table public.surnames (
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

-- Profiles table: created on sign-up
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  total_games int default 0,
  total_score numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Games table: one row per play session
create table public.games (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surname_id uuid not null references public.surnames(id) on delete cascade,
  answer_text text not null,
  total_score numeric(10,2) not null,
  scores jsonb not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_games_user_id on public.games(user_id);
create index idx_games_surname_id on public.games(surname_id);
create index idx_games_total_score on public.games(total_score desc);

-- RLS policies
alter table public.surnames enable row level security;
alter table public.profiles enable row level security;
alter table public.games enable row level security;

-- Surnames: anyone can read
create policy "Surnames are public" on public.surnames
  for select using (true);

-- Profiles: anyone can read, users can update their own
create policy "Profiles are public" on public.profiles
  for select using (true);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Games: anyone can read (for leaderboards), users can insert their own
create policy "Games are public" on public.games
  for select using (true);

create policy "Users can insert own games" on public.games
  for insert with check (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
