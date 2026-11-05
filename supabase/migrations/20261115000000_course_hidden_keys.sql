-- « Pour moi » (Avant de commencer) enregistré avec la séance : éléments du déroulé qui ne sont
-- jamais projetés, quel que soit le lien utilisé pour ouvrir la fenêtre projetée.
-- NULL = aucun choix fait : la projection applique les valeurs par défaut (corrigés et fiches
-- « pour aller plus loin » non projetés). Colonne additive : sans elle, les défauts s'appliquent.

alter table public.course
  add column hidden_keys text[];
