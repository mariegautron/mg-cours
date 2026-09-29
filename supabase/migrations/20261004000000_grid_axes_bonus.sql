-- US-82 — Axes avec sous-totaux, références, bonus hors barème, critère validé d'office.
-- Un critère peut appartenir à un axe (`axis_id`), porter une référence libre (ex. « RGAA 1.3.1 »)
-- et être un bonus (`is_bonus` : hors barème, jamais compté dans le dénominateur). Un critère est
-- « validé d'office » par évaluation (`assessment.auto_validated_criterion_ids`) : il reçoit son palier
-- le plus haut sans saisie, car la grille se réutilise d'une phase à l'autre.

create table public.grid_axis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grading_grid_id uuid not null references public.grading_grid (id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grid_axis_grid_idx on public.grid_axis (grading_grid_id, position);

select public.mg_apply_conventions(array['grid_axis']);

alter table public.grid_criterion
  add column axis_id uuid references public.grid_axis (id) on delete set null,
  add column reference text,
  add column is_bonus boolean not null default false;

create index grid_criterion_axis_idx on public.grid_criterion (axis_id);

alter table public.assessment
  add column auto_validated_criterion_ids uuid[] not null default '{}';
