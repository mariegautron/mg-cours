-- US-96 — Rattrapage d'un sujet individuel, pour les seul·es absent·es excusé·es (US-87).
-- Le rattrapage est une évaluation à part entière liée à l'originale (`makeup_of_id`) : même grille, même
-- coefficient, même barème, sujet similaire (copie de l'original en brouillon « à construire »). Il n'a
-- pas de groupe propre : `assessment_student` liste les étudiant·es concerné·es. Sa note remplace
-- l'absence excusée de l'originale dans la moyenne ; il ne compte pas dans le compteur de notes YNOV
-- (1 évaluation = 1 note). Un seul rattrapage par évaluation : les absent·es excusé·es qui s'ajoutent
-- plus tard rejoignent le même.

alter table public.assessment
  add column makeup_of_id uuid references public.assessment (id) on delete cascade,
  add constraint assessment_makeup_not_self_ck check (makeup_of_id is null or makeup_of_id <> id);

create unique index assessment_makeup_of_uidx on public.assessment (makeup_of_id)
  where makeup_of_id is not null;

create table public.assessment_student (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create index assessment_student_student_idx on public.assessment_student (student_id);

select public.mg_apply_conventions(array['assessment_student']);
