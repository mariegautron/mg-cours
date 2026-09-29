-- US-90 — Sujet lié à la séance, avec ses fichiers (absorbe US-69).
-- La consigne reste `assessment.subject` (Markdown). Ajouts : séance de rattachement, objectif,
-- rendu attendu, « ce qui sera évalué », fichiers joints et état de préparation.
-- Fichiers : bucket privé `assessment-files`, un dossier par propriétaire
-- (<owner_id>/<assessment_id>/<fichier>) ; métadonnées dans assessment.files ([{ path, name, size, mime }]).
-- .html, .txt et .zip sont acceptés pour les sujets qui fournissent du code : ils ne sont servis qu'en
-- téléchargement forcé (route /api/assessments/[id]/files/[name]), jamais affichés ni projetés.

create type public.assessment_prep_status as enum ('to_build', 'ready', 'provided');

alter table public.assessment
  add column course_id uuid references public.course (id) on delete set null,
  add column objective text,
  add column deliverable_md text,
  add column evaluated_md text,
  add column files jsonb not null default '[]',
  add column prep_status public.assessment_prep_status not null default 'to_build';

create index assessment_course_idx on public.assessment (course_id);

-- Une évaluation déjà notée a forcément été fournie.
update public.assessment a
set prep_status = 'provided'
where exists (select 1 from public.grade g where g.assessment_id = a.id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assessment-files', 'assessment-files', false, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/html',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;

create policy assessment_files_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'assessment-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'assessment-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
