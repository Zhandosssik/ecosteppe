-- Чат: капитан тоже считается участником (даже если строка в team_members отсутствует)

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
