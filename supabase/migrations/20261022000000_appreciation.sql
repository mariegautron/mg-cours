-- US-149a — Appréciations pour Hyperplanning : un texte par étudiant·e et par module, écrit à la
-- main par Marie (aucune génération automatique). Nouvelle table : sans elle, la page des
-- appréciations indique que la fonction arrive après la mise à jour de la base. Privé : RLS
-- `owner_id = auth.uid()`, aucun accès anonyme. Purement additif.

create table public.appreciation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, student_id)
);

select public.mg_apply_conventions(array['appreciation']);
