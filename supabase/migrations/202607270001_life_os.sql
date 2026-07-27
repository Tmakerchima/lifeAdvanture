create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  city text not null default '',
  life_stage text not null default '',
  about_me text not null default '',
  interests text[] not null default '{}',
  core_values text[] not null default '{}',
  preferred_pace text not null default 'balanced',
  energy_budget smallint not null default 3 check (energy_budget between 1 and 5),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('thought', 'dilemma', 'goal', 'reflection')),
  title text not null,
  content text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  priority smallint not null default 3 check (priority between 1 and 5),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.energy_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  energy smallint not null check (energy between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_date date not null,
  quest_title text not null,
  quest_description text not null,
  rationale text not null,
  coaching_note text not null default '',
  reflection_question text not null default '',
  quest_type text not null default 'reflect',
  xp integer not null default 30 check (xp between 1 and 100),
  minutes integer not null default 30 check (minutes between 5 and 240),
  model text not null default 'qwen-plus',
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, recommendation_date)
);

create index if not exists life_entries_user_updated_idx
  on public.life_entries(user_id, updated_at desc);
create index if not exists energy_logs_user_created_idx
  on public.energy_logs(user_id, created_at desc);
create index if not exists daily_recommendations_user_date_idx
  on public.daily_recommendations(user_id, recommendation_date desc);

alter table public.profiles enable row level security;
alter table public.life_entries enable row level security;
alter table public.energy_logs enable row level security;
alter table public.daily_recommendations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "entries_select_own" on public.life_entries;
create policy "entries_select_own" on public.life_entries
  for select using ((select auth.uid()) = user_id);
drop policy if exists "entries_insert_own" on public.life_entries;
create policy "entries_insert_own" on public.life_entries
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "entries_update_own" on public.life_entries;
create policy "entries_update_own" on public.life_entries
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "entries_delete_own" on public.life_entries;
create policy "entries_delete_own" on public.life_entries
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "energy_logs_select_own" on public.energy_logs;
create policy "energy_logs_select_own" on public.energy_logs
  for select using ((select auth.uid()) = user_id);
drop policy if exists "energy_logs_insert_own" on public.energy_logs;
create policy "energy_logs_insert_own" on public.energy_logs
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "energy_logs_update_own" on public.energy_logs;
create policy "energy_logs_update_own" on public.energy_logs
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "energy_logs_delete_own" on public.energy_logs;
create policy "energy_logs_delete_own" on public.energy_logs
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "recommendations_select_own" on public.daily_recommendations;
create policy "recommendations_select_own" on public.daily_recommendations
  for select using ((select auth.uid()) = user_id);
drop policy if exists "recommendations_insert_own" on public.daily_recommendations;
create policy "recommendations_insert_own" on public.daily_recommendations
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "recommendations_update_own" on public.daily_recommendations;
create policy "recommendations_update_own" on public.daily_recommendations
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists life_entries_set_updated_at on public.life_entries;
create trigger life_entries_set_updated_at
before update on public.life_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
