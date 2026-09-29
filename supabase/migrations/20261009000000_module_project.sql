-- US-88 — Projet fil rouge en jalons. Un module a au plus un projet (titre, brief et contexte client
-- en Markdown). Chaque jalon, l'oral et l'évaluation individuelle sont des évaluations ordinaires
-- (`assessment`) rattachées au projet : le compteur de notes YNOV reste juste, sans ligne de comptage
-- à part. `project_role` dit ce que représente l'évaluation dans le projet.

create type public.project_role as enum ('milestone', 'oral', 'individual');

create table public.module_project (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null unique references public.module (id) on delete cascade,
  title text not null,
  brief_md text not null default '',
  client_context_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['module_project']);

alter table public.assessment
  add column project_id uuid references public.module_project (id) on delete set null,
  add column project_role public.project_role,
  add column project_position integer;

create index assessment_project_idx on public.assessment (project_id);
