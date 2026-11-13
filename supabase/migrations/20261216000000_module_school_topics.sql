-- « Sujets à voir avec l'école » : un champ libre par module (demande d'Arnaud, 13 nov. 2026).
-- Texte libre, modifiable depuis la page du module ; affiché sur Aujourd'hui quand il est rempli.
-- Additive : aucune ligne lue ni modifiée.

alter table public.module
  add column if not exists school_topics text;

comment on column public.module.school_topics is
  'Sujets à voir avec l''école (texte libre de Marie). Vide ou null : rien à afficher sur Aujourd''hui.';
