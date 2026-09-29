-- US-53 : attendus de l'école pour un module (objectifs pédagogiques + objectif de chaque unité).
-- Les unités pédagogiques (modalité FFP/TDP, heures) sont des repères indicatifs : seul le total
-- d'heures du module est contraignant.
create type public.expectation_kind as enum ('objective', 'unit');

create table public.module_expectation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  kind public.expectation_kind not null,
  label text not null check (char_length(label) between 1 and 1000),
  position integer not null default 0,
  hours numeric check (hours is null or (hours >= 0 and hours <= 500)),
  modality text check (modality is null or modality in ('FFP', 'TDP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index module_expectation_module_idx on public.module_expectation (module_id, position);

select public.mg_apply_conventions(array['module_expectation']);
