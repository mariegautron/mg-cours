-- Schéma BDD, lot 5 (1/2) : type d'évaluation unique, `assessment.kind` (enum assessment_kind).
--
-- CE QUE FAIT LA MIGRATION (purement additive) :
--   crée l'enum `assessment_kind` et la colonne `assessment.kind`, NULLABLE, sans défaut. Le
--   remplissage est dans la migration suivante (20261212000100), relue avant d'être poussée.
--   Aujourd'hui le type vit en trois endroits : `type` (texte libre, 20 combinaisons en prod),
--   `exam_kind` (vide sur 8 évaluations) et des drapeaux (`is_bonus`, `makeup_of_id`). `kind`
--   deviendra la seule source ; `is_bonus` et `makeup_of_id` restent des drapeaux à part.
--   Valeurs :
--     files            rendu de fichiers ou de liens (projet, dossier, spécifications…)
--     quiz             QCM en ligne (correction automatique)
--     open_questions   questions ouvertes tirées au sort (« Étude de cas »)
--     in_class         écrit en classe, sur table
--     oral             oral (de groupe ou individuel)
--     progress_review  point d'étape (noté ou non)
--     school_grade     « Note de l'école » (coefficient imposé)
--     other            rien de reconnu : à reclasser à la main
--
-- CE QUI CHANGE POUR MARIE : rien. Le formulaire n'est pas encore branché sur `kind`.
--
-- RETOUR ARRIÈRE :
--   alter table public.assessment drop column if exists kind;
--   drop type if exists public.assessment_kind;
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot5.sql

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assessment_kind'
                 and typnamespace = 'public'::regnamespace) then
    create type public.assessment_kind as enum (
      'files', 'quiz', 'open_questions', 'in_class', 'oral', 'progress_review', 'school_grade', 'other'
    );
  end if;
end;
$$;

alter table public.assessment add column if not exists kind public.assessment_kind;

comment on column public.assessment.kind is
  'Type d''évaluation unique (lot 5). Remplace à terme type (texte libre) et exam_kind. '
  'is_bonus et makeup_of_id restent des drapeaux à part.';
