-- US-93 — Suivi des rendus : par évaluation (jalon) et par groupe, rendu reçu, date, lien (Moodle,
-- dépôt Git). Donnée de suivi de Marie, jamais exposée aux étudiant·es.

create table public.project_submission (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  received_on date not null,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_group_id)
);

select public.mg_apply_conventions(array['project_submission']);
