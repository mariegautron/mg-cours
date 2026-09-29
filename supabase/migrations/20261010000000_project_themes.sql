-- US-89 — Thèmes du projet fil rouge (3 au choix, par exemple) et affectation aux groupes.
-- Un groupe a au plus un thème ; plusieurs groupes peuvent avoir le même. `method` distingue le
-- choix des volontaires (saisi par Marie) du tirage ; `draw_seed` garde la graine du tirage pour le
-- reproduire à l'identique.

create type public.theme_assignment_method as enum ('volunteer', 'draw');

create table public.project_theme (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.module_project (id) on delete cascade,
  title text not null,
  description_md text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_theme_project_idx on public.project_theme (project_id);

create table public.project_theme_assignment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.module_project (id) on delete cascade,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  theme_id uuid not null references public.project_theme (id) on delete cascade,
  method public.theme_assignment_method not null,
  draw_seed text,
  drawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, student_group_id)
);

create index project_theme_assignment_theme_idx on public.project_theme_assignment (theme_id);

select public.mg_apply_conventions(array['project_theme', 'project_theme_assignment']);
