-- Доп. поле для заявки и bucket для фото (выполните в Supabase SQL Editor)

alter table public.reports
  add column if not exists notes text;

insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;
