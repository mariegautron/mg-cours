-- Barème d'une évaluation (note sur N). Vide → total des critères de la grille, sinon 20.
-- grade.value reste la note brute sur ce barème ; les moyennes YNOV la ramènent sur 20.

alter table public.assessment
  add column max_score numeric(6, 2) check (max_score > 0);
