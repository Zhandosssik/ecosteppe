-- Выполните в Supabase SQL Editor

create type report_status as enum ('pending', 'verified', 'rejected');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  ai_verified boolean not null default false,
  ai_confidence double precision,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

alter table public.reports enable row level security;

create policy "read verified reports"
  on public.reports
  for select
  using (status = 'verified');

grant usage on schema public to anon, authenticated;
grant select on public.reports to anon, authenticated;

-- insert/update — добавьте политики после включения auth
