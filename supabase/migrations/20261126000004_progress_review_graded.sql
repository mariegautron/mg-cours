-- Point d'étape noté ou non (retour d'Arnaud, 10 nov. 2026) : case « Noté », décochée par défaut.
-- Non noté : retours seulement, hors moyennes et hors notes exigées. Noté : évaluation notée comme
-- les autres, avec en plus les repères et retours du point d'étape. Ajout seulement.
-- Retour arrière : alter table public.assessment drop column review_graded;

alter table public.assessment
  add column if not exists review_graded boolean not null default false;
