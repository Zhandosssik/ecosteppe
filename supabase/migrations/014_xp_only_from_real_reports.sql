-- XP и счётчики только из реальных verified-отчётов с user_id

update public.profiles set xp = 0, updated_at = now();

update public.profiles p
set
  xp = coalesce(
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

update public.teams t
set
  member_count = coalesce(
    (select count(*)::integer from public.team_members tm where tm.team_id = t.id),
    0
  ),
  total_xp = 0,
  dumps_cleared = 0;

update public.teams t
set
  total_xp = coalesce(
    (
      select sum(p.xp)::integer
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = t.id
    ),
    0
  ),
  dumps_cleared = coalesce(
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
