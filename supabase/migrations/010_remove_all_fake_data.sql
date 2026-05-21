-- Полная очистка фейковых данных: рейтинг + команды

delete from public.rankings_seed;
drop table if exists public.rankings_seed;

delete from public.seasonal_challenges;
delete from public.regions;

delete from public.team_messages
where team_id in (select id from public.teams where captain_id is null);

delete from public.team_cleanup_events
where team_id in (select id from public.teams where captain_id is null);

delete from public.team_cleanups;

delete from public.team_members
where team_id in (select id from public.teams where captain_id is null);

delete from public.teams
where captain_id is null
   or name in (
     'Степные волки',
     'Эко-орда',
     'Чистый хоран',
     'Батыры Алаколя',
     'Зелёный караван'
   );

update public.profiles set xp = 0;

update public.profiles p
set xp = coalesce(
  (
    select count(*)::integer * 50
    from public.reports r
    where r.user_id = p.id
      and r.status = 'verified'
      and r.ai_verified = true
  ),
  0
),
updated_at = now();

update public.teams
set total_xp = 0, dumps_cleared = 0, member_count = 0;

update public.teams t
set member_count = coalesce(
  (select count(*)::integer from public.team_members tm where tm.team_id = t.id),
  0
);

update public.teams t
set total_xp = coalesce(
  (
    select sum(p.xp)::integer
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = t.id
  ),
  0
);

update public.teams t
set dumps_cleared = coalesce(
  (
    select count(*)::integer
    from public.reports r
    join public.team_members tm on tm.user_id = r.user_id
    where tm.team_id = t.id
      and r.status = 'verified'
      and r.ai_verified = true
  ),
  0
);
