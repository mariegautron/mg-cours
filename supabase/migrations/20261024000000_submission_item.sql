-- US-145 — Rendus multiples : plusieurs fichiers ou liens par personne (évaluation individuelle) ou
-- par groupe (note de groupe). Aujourd'hui `project_submission` ne garde qu'un lien par groupe.
-- Nouvelle table, sans toucher à l'ancienne : sans elle, on retombe sur le lien unique existant.
-- Cette nuit : ajout par Marie seulement (`added_by = 'teacher'`) ; le dépôt par l'étudiant·e
-- viendra plus tard. Les fichiers sont dans le bucket privé existant `assessment-files`.
-- Privé : RLS `owner_id = auth.uid()`, aucun accès anonyme. Purement additif.

create table public.submission_item (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_id uuid references public.student (id) on delete cascade,
  group_id uuid references public.student_group (id) on delete cascade,
  kind text not null check (kind in ('file', 'link')),
  url text,
  storage_path text,
  label text not null default '',
  file_name text,
  mime text,
  size_bytes bigint,
  added_by text not null default 'teacher' check (added_by in ('teacher', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_item_owner_ck check ((student_id is null) <> (group_id is null)),
  constraint submission_item_kind_ck check (
    (kind = 'link' and url is not null) or (kind = 'file' and storage_path is not null)
  )
);

create index submission_item_assessment_idx on public.submission_item (assessment_id);

select public.mg_apply_conventions(array['submission_item']);
