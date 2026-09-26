-- Slides d'un module : lien Figma + fichiers (anciens cours). Les diaporamas sont plus gros que les
-- PDF/Word : limite du bucket portée à 50 Mo et formats de présentation acceptés.
alter table public.module add column slides_url text;

alter type public.module_document_kind add value if not exists 'slides';

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.apple.keynote',
    'application/x-iwork-keynote-sffkey'
  ]
where id = 'module-documents';
