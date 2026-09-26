-- Fichiers d'une ressource (supports PDF, slides, images affichées dans le contenu Markdown).
-- Bucket privé, un dossier par propriétaire : <owner_id>/<resource_id>/<fichier>.
-- Les métadonnées vont dans resource.files ([{ path, name, size, mime }]), déjà protégée par la RLS.
-- Pas de SVG : ouvert via un lien signé, il pourrait exécuter du script.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-files', 'resource-files', false, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.apple.keynote',
    'application/x-iwork-keynote-sffkey',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
)
on conflict (id) do nothing;

create policy resource_files_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'resource-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resource-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
