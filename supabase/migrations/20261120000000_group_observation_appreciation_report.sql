-- Observations sur un groupe entier (fiche groupe, lot 4) et suivi du report des appréciations
-- dans Hyperplanning. Aucune donnée existante n'est modifiée.

create table public.group_observation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  course_id uuid references public.course (id) on delete set null,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  tag public.observation_tag not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index group_observation_group_idx on public.group_observation (student_group_id, created_at desc);
create index group_observation_course_idx on public.group_observation (course_id, created_at desc);

select public.mg_apply_conventions(array['group_observation']);

-- Texte tel qu'il était au moment du report (null = pas encore reporté) ; brouillon proposé à relire.
alter table public.appreciation
  add column reported_text text,
  add column is_proposal boolean not null default false;
