-- Retour arrière du lot 2 (20261207000000_schema_lot2_cles_et_controles.sql).
-- À lancer seulement si le lot 2 pose problème, avec l'accord d'Arnaud. Ne touche aucune donnée :
-- retire seulement les contraintes, index et commentaires ajoutés.
-- Puis, pour que `db push` ne rejoue pas le lot : supabase migration repair --status reverted 20261207000000

alter table public.expectation_dismissal drop constraint if exists expectation_dismissal_expectation_fk;
alter table public.quiz_question_criterion drop constraint if exists quiz_question_criterion_question_fk;
alter table public.grade drop constraint if exists grade_value_nonneg_ck;
alter table public.grade drop constraint if exists grade_raw_score_nonneg_ck;
alter table public.assessment drop constraint if exists assessment_coefficient_pos_ck;
alter table public.assessment drop constraint if exists assessment_makeup_bonus_individual_ck;
alter table public.course drop constraint if exists course_prep_status_ck;
drop index if exists public.expectation_dismissal_expectation_idx;
drop index if exists public.quiz_question_criterion_question_idx;
comment on column public.oral_space.subject_id is null;
comment on column public.progress_review.subject_id is null;
comment on column public.import_ref.target_id is null;
comment on column public.submission_item.batch_id is null;
