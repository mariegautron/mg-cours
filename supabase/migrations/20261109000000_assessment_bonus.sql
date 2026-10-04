-- Note bonus de certification (ex. Opquast) : une évaluation individuelle « bonus » dont la note
-- sur 20 se calcule à partir d'un score saisi (0 à 1000) par un barème à bandes.
-- Additif : colonnes `score_scale` (barème, jsonb) et `is_bonus` sur l'évaluation, `raw_score`
-- (score saisi) sur la note. Rien n'est modifié ni supprimé ; sans la migration, la fonction répond
-- « disponible après la mise à jour ».
alter table public.assessment
  add column if not exists score_scale jsonb,
  add column if not exists is_bonus boolean not null default false;

alter table public.grade
  add column if not exists raw_score numeric;
