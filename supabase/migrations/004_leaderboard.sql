-- Рейтинги: XP батыров, команды, регионы, сезонные челленджи

alter table public.profiles
  add column if not exists xp integer not null default 0 check (xp >= 0);

-- Чтение профилей для таблицы лидеров
drop policy if exists "profiles_select_leaderboard" on public.profiles;
create policy "profiles_select_leaderboard"
  on public.profiles for select
  to authenticated, anon
  using (true);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  member_count integer not null default 0 check (member_count >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  dumps_cleared integer not null default 0 check (dumps_cleared >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id)
);

create index if not exists team_members_team_id_idx on public.team_members (team_id);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cleared_total integer not null default 0 check (cleared_total >= 0),
  cleared_7d integer not null default 0 check (cleared_7d >= 0),
  liquidation_pct_7d numeric(5, 2) not null default 0 check (liquidation_pct_7d >= 0 and liquidation_pct_7d <= 100),
  trend_pct numeric(5, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.seasonal_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starts_at date not null,
  ends_at date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.regions enable row level security;
alter table public.seasonal_challenges enable row level security;

create policy "teams_select_all"
  on public.teams for select
  to authenticated, anon
  using (true);

create policy "team_members_select_own"
  on public.team_members for select
  to authenticated
  using (auth.uid() = user_id);

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "regions_select_all"
  on public.regions for select
  to authenticated, anon
  using (true);

create policy "challenges_select_all"
  on public.seasonal_challenges for select
  to authenticated, anon
  using (true);

grant select on public.teams to anon, authenticated;
grant select on public.regions to anon, authenticated;
grant select on public.seasonal_challenges to anon, authenticated;
grant select on public.team_members to authenticated;
grant insert on public.team_members to authenticated;

-- Демо-данные не добавляются. Очистка существующей БД: 010_remove_all_fake_data.sql

-- +50 XP за каждый verified отчёт
create or replace function public.award_xp_on_verified_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.status = 'verified' and new.ai_verified = true then
    update public.profiles
    set xp = xp + 50, updated_at = now()
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_award_xp on public.reports;
create trigger reports_award_xp
  after insert on public.reports
  for each row
  execute function public.award_xp_on_verified_report();
