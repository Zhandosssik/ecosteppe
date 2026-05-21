-- Управление командами: описание, капитан, чат, уборки, события

alter table public.teams
  add column if not exists description text,
  add column if not exists captain_id uuid references auth.users (id) on delete set null;

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists team_messages_team_created_idx
  on public.team_messages (team_id, created_at desc);

create table if not exists public.team_cleanup_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  scheduled_at timestamptz not null,
  title text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists team_cleanup_events_team_scheduled_idx
  on public.team_cleanup_events (team_id, scheduled_at asc);

create table if not exists public.team_cleanups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  photo_url text,
  cleared_at timestamptz not null default now(),
  title text
);

create index if not exists team_cleanups_team_cleared_idx
  on public.team_cleanups (team_id, cleared_at desc);

alter table public.team_messages enable row level security;
alter table public.team_cleanup_events enable row level security;
alter table public.team_cleanups enable row level security;

-- Участники одной команды видят друг друга
drop policy if exists "team_members_select_all" on public.team_members;
create policy "team_members_select_all"
  on public.team_members for select
  to authenticated
  using (true);

drop policy if exists "team_members_select_teammates" on public.team_members;
create policy "team_members_select_teammates"
  on public.team_members for select
  to authenticated
  using (
    team_id in (
      select tm.team_id from public.team_members tm where tm.user_id = auth.uid()
    )
  );

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated"
  on public.teams for insert
  to authenticated
  with check (captain_id = auth.uid());

drop policy if exists "teams_update_captain" on public.teams;
create policy "teams_update_captain"
  on public.teams for update
  to authenticated
  using (captain_id = auth.uid());

drop policy if exists "team_members_delete_captain" on public.team_members;
create policy "team_members_delete_captain"
  on public.team_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.captain_id = auth.uid()
    )
    and user_id <> auth.uid()
  );

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  )
  or exists (
    select 1 from public.teams
    where id = p_team_id and captain_id = auth.uid()
  );
$$;

grant execute on function public.is_team_member(uuid) to authenticated;

create policy "team_messages_select_member"
  on public.team_messages for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "team_messages_insert_member"
  on public.team_messages for insert
  to authenticated
  with check (
    public.is_team_member(team_id) and user_id = auth.uid()
  );

create policy "team_events_select_member"
  on public.team_cleanup_events for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "team_events_insert_member"
  on public.team_cleanup_events for insert
  to authenticated
  with check (
    public.is_team_member(team_id) and created_by = auth.uid()
  );

create policy "team_cleanups_select_member"
  on public.team_cleanups for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "team_cleanups_select_preview" on public.team_cleanups;
create policy "team_cleanups_select_preview"
  on public.team_cleanups for select
  to authenticated
  using (true);

drop policy if exists "team_events_select_preview" on public.team_cleanup_events;
create policy "team_events_select_preview"
  on public.team_cleanup_events for select
  to authenticated
  using (true);

grant insert on public.teams to authenticated;
grant update on public.teams to authenticated;
grant delete on public.team_members to authenticated;
grant select, insert on public.team_messages to authenticated;
grant select, insert on public.team_cleanup_events to authenticated;
grant select on public.team_cleanups to authenticated;

-- Storage: bucket team-logos (public read) в Dashboard → Storage
-- Realtime: Database → Replication → team_messages

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- team_cleanups заполняются только реальными уборками команды
