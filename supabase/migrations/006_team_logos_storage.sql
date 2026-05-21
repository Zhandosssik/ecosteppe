-- Bucket для логотипов команд (выполните в Supabase SQL Editor, если загрузка падает с Bucket not found)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-logos',
  'team-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Публичное чтение логотипов
drop policy if exists "team_logos_public_read" on storage.objects;
create policy "team_logos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'team-logos');

-- Загрузка через service role (API) — политика для authenticated на свой каталог
drop policy if exists "team_logos_auth_upload" on storage.objects;
create policy "team_logos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "team_logos_auth_update" on storage.objects;
create policy "team_logos_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
