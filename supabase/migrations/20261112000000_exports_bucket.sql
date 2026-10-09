-- Exports générés (cours en PDF / zip, évaluations) trop lourds pour être renvoyés directement par
-- une fonction (limite de réponse de 4,5 Mo) : le fichier est déposé ici, puis téléchargé par une URL
-- signée de quelques secondes. Bucket PRIVÉ, un dossier par enseignante (comme `module-documents`) ;
-- un fichier par module et par type est écrasé à chaque export : rien ne s'accumule.
-- Sans ce bucket, les exports légers continuent de fonctionner par réponse directe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports', 'exports', false, 52428800,
  array['application/pdf', 'application/zip']
)
on conflict (id) do nothing;

create policy exports_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
