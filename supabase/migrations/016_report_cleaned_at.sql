-- Завершённые уборки: скрываем из активных, храним в «Завершённые» 15 дней

alter table public.reports
  add column if not exists cleaned_at timestamptz;

create index if not exists reports_cleaned_at_idx
  on public.reports (cleaned_at desc)
  where cleaned_at is not null;

-- Ретроактивно: заявки с подтверждённым фото «после уборки»
update public.reports r
set cleaned_at = c.created_at
from public.reports c
where r.cleaned_at is null
  and c.notes like '%[cleanup:' || r.id::text || ']%'
  and c.status = 'verified';
