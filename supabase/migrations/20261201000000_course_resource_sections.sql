-- Contenu des cours, point 15 : une même ressource partagée, dont une séance ne garde que certaines
-- parties (sections `##`). `selected_sections` vide (null) = tout le cours. `known_sections` = les
-- sections du cours au moment du choix : une section ajoutée plus tard est signalée sur la séance
-- (« Le cours a une nouvelle partie : l'ajouter ? »), jamais ajoutée d'office.
-- Colonnes nullables, aucune ligne existante modifiée.

alter table public.course_resource
  add column if not exists selected_sections text[],
  add column if not exists known_sections text[];

comment on column public.course_resource.selected_sections is
  'Titres des sections ## retenues pour cette séance ; null = tout le cours.';
comment on column public.course_resource.known_sections is
  'Titres des sections ## du cours au moment du choix (détection des nouvelles parties).';
