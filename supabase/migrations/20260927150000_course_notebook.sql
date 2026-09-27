-- Carnet de séance (US-65 + US-67) : observations sur les étudiant·es pendant le cours et
-- clôture de la séance. Données strictement privées : jamais projetées, exportées ni envoyées.

-- ── Observations (US-65) ─────────────────────────────────────────────────────

create type public.observation_tag as enum (
  'relevant_question', -- question pertinente
  'participation',
  'difficulty',
  'absent_late',       -- absent·e ou retard
  'other'
);

create table public.student_observation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  course_id uuid references public.course (id) on delete set null,
  student_id uuid not null references public.student (id) on delete cascade,
  tag public.observation_tag not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_observation_student_idx on public.student_observation (student_id, created_at desc);
create index student_observation_course_idx on public.student_observation (course_id, created_at desc);

select public.mg_apply_conventions(array['student_observation']);

-- ── Clôture de séance (US-67) ────────────────────────────────────────────────

create type public.course_completion as enum ('done', 'partial', 'not_done');

alter table public.course
  add column completion public.course_completion,
  add column not_covered text,     -- points non traités, à reporter
  add column next_time text,       -- « À faire pour la prochaine fois »
  add column retro_note text;      -- retour d'expérience privé
