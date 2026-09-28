-- US-81 — Paliers par critère : chaque critère a ses propres paliers (points + description),
-- en nombre libre (6/4/2/0, 8/6/4/2/0, 2/1/0…). `grid_criterion.weight` reste le barème du critère
-- (= palier le plus haut quand il y a des paliers). `grade.scores` ({criterion_id: points}) ne change pas :
-- un critère sans palier garde la saisie numérique libre.

create table public.criterion_level (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grid_criterion_id uuid not null references public.grid_criterion (id) on delete cascade,
  points numeric(6, 2) not null check (points >= 0),
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grid_criterion_id, points)
);

create index criterion_level_criterion_idx on public.criterion_level (grid_criterion_id, position);

select public.mg_apply_conventions(array['criterion_level']);
