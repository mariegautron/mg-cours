-- Mise en place de la classe : inscription étudiant·e ↔ module, indépendante des groupes, et
-- « A quitté le module » (la personne reste visible, ses notes et observations sont gardées, elle
-- sort des comptes). Jusqu'ici, une personne n'était reliée à un module que par un groupe.
--
-- Reprise : chaque membre actuel d'un groupe du module y est inscrit·e (aucune ligne existante
-- n'est modifiée ; seules des lignes nouvelles sont créées dans cette nouvelle table).

create table public.module_student (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  -- Date à laquelle la personne a quitté le module ; null = inscrite.
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, student_id)
);

create index module_student_student_idx on public.module_student (student_id);

select public.mg_apply_conventions(array['module_student']);

insert into public.module_student (owner_id, module_id, student_id)
select distinct g.owner_id, g.module_id, m.student_id
from public.group_member m
join public.student_group g on g.id = m.student_group_id
on conflict (module_id, student_id) do nothing;
