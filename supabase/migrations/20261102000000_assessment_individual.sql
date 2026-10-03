-- Lot 4 · évaluation individuelle (maquette IndPrep) : type d'épreuve structuré, deux versions de
-- sujet, mode d'arrivée des rendus et sujet de rattrapage préparé d'avance. Colonnes additives et
-- facultatives : sans elles, la page n'affiche pas ces choix (code tolérant), rien n'est perdu.

alter table public.assessment
  add column if not exists exam_kind text
    check (exam_kind in ('files', 'qcm', 'in_class', 'oral')),
  add column if not exists subject_versions text not null default 'single'
    check (subject_versions in ('single', 'ab')),
  add column if not exists submission_mode text
    check (submission_mode in ('app', 'manual')),
  add column if not exists makeup_prepared boolean not null default false;
