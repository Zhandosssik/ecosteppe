-- Свои отчёты для статистики профиля; привязка user_id при создании

create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = user_id);
