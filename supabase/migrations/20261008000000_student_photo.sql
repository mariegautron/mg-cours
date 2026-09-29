-- US-66 — Trombinoscope. Une photo par étudiant·e, dans un bucket privé (un dossier par
-- propriétaire : <owner_id>/<student_id>/<fichier>). Elle n'est servie que par une route
-- authentifiée qui redirige vers un lien signé de quelques secondes : jamais de lien public, jamais
-- dans les exports, e-mails ou présentations.
-- Formats limités (pas de SVG : ouvert via un lien signé, il pourrait exécuter du script).

alter table public.student add column photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos', 'student-photos', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy student_photos_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'student-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
