-- Настройки профиля, статус волонтёра

alter table public.profiles
  add column if not exists locale text not null default 'ru'
    check (locale in ('ru', 'kk', 'en')),
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists volunteer_status text not null default 'none'
    check (volunteer_status in ('none', 'pending', 'approved', 'rejected'));
