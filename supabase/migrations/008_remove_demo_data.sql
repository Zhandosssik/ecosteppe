-- Удаление демо-данных рейтинга и чужих команд (оставляем только команды с капитаном — созданные пользователями)

delete from public.rankings_seed;

-- События, чат, уборки демо-команд
delete from public.team_messages
where team_id in (select id from public.teams where captain_id is null);

delete from public.team_cleanup_events
where team_id in (select id from public.teams where captain_id is null);

delete from public.team_cleanups
where team_id in (select id from public.teams where captain_id is null);

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

-- Демо-регионы рейтинга
delete from public.regions;

-- XP и статистика команд: см. 009_reset_all_xp.sql
