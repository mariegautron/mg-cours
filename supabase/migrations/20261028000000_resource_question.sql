-- US-156 — Lier des questions de la banque à une ressource (ressource d'origine des questions).
-- Table de liaison : une ligne par couple (ressource, question). Privée : RLS `owner_id = auth.uid()`.
-- Sans elle : la banque et les ressources fonctionnent comme avant, la liaison est indisponible.

create table public.resource_question (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resource_id uuid not null references public.resource (id) on delete cascade,
  question_id uuid not null references public.question (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id, question_id)
);

create index resource_question_question_idx on public.resource_question (question_id);

select public.mg_apply_conventions(array['resource_question']);
