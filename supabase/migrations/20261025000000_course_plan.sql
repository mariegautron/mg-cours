-- US-124 — Construire les séances : ordre du déroulé d'une séance et « livrable de séance ».
-- Nouvelle table (une ligne par séance) plutôt qu'une colonne de rang sur `course_resource`, lue
-- partout : sans elle, le déroulé garde son ordre actuel et le livrable n'est pas proposé.
-- `resource_order` : identifiants des ressources dans l'ordre voulu (les absentes de la liste
-- suivent dans l'ordre actuel). Privé : RLS `owner_id = auth.uid()`. Purement additif.

create table public.course_plan (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null unique references public.course (id) on delete cascade,
  deliverable text not null default '',
  resource_order uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['course_plan']);
