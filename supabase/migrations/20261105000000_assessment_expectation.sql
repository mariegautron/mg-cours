-- « Attendus évalués » : quels attendus de l'école une évaluation vérifie (maquettes Evaluation /
-- Filrouge : « Attendus évalués : 2 sur 6 »). Table additive ; sans elle, l'écran le dit au lieu
-- d'échouer.

create table if not exists public.assessment_expectation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  module_expectation_id uuid not null references public.module_expectation (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (assessment_id, module_expectation_id)
);

create index if not exists assessment_expectation_assessment_idx
  on public.assessment_expectation (assessment_id);

alter table public.assessment_expectation enable row level security;

create policy "assessment_expectation_owner" on public.assessment_expectation
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
