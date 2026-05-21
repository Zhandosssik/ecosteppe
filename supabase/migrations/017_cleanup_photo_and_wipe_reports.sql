-- Фото «после уборки» на исходной заявке (без дубликата в активных)
alter table public.reports
  add column if not exists cleanup_photo_url text;

-- Удалить служебные дубликаты (старый формат [cleanup:uuid])
delete from public.reports
where notes like '%[cleanup:%';

-- Очистить все заявки (по запросу)
delete from public.reports;
