-- Documents déposés sur un module : attendus de l'école (fiche pédagogique)
-- et trame déjà envoyée (module déjà réalisé). Fichiers dans un bucket privé,
-- un dossier par propriétaire : <owner_id>/<module_id>/<fichier>.

create type public.module_document_kind as enum ('school_expectations', 'outline_sent');

create table public.module_document (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  kind public.module_document_kind not null,
  name text not null,
  path text not null,
  size_bytes integer not null,
  mime text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index module_document_module_idx on public.module_document (module_id, kind);

select public.mg_apply_conventions(array['module_document']);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'module-documents', 'module-documents', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text'
  ]
)
on conflict (id) do nothing;

create policy module_documents_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'module-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'module-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
