-- Политика team_members_select_teammates читает team_members внутри своего USING —
-- PostgreSQL: infinite recursion detected in policy for relation "team_members"

drop policy if exists "team_members_select_teammates" on public.team_members;

-- Один простой SELECT для авторизованных (список участников на странице команды)
drop policy if exists "team_members_select_all" on public.team_members;
create policy "team_members_select_all"
  on public.team_members for select
  to authenticated
  using (true);
