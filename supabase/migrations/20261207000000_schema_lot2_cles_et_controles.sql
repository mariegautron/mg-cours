-- Schéma BDD, lot 2 : clés étrangères et contrôles manquants.
--
-- CE QUE FAIT LA MIGRATION :
--   Le diagnostic du 12 nov. 2026 (supabase/snapshots/diagnostic-schema.sql, sections 3 à 6) n'a
--   trouvé AUCUNE ligne en défaut. Chaque contrainte est donc posée « not valid » puis validée
--   tout de suite, dans cette même migration. Si une ligne en défaut était apparue entre-temps,
--   la validation échoue et TOUTE la migration est annulée (rien n'est appliqué).
--   Clés étrangères (la ligne liée disparaît avec son parent, comme le reste du schéma) :
--     - expectation_dismissal.expectation_id → module_expectation(id) on delete cascade ;
--     - quiz_question_criterion.question_id → question(id) on delete cascade.
--   Contrôles :
--     - grade.value >= 0 et grade.raw_score >= 0 (une note n'est jamais négative) ;
--     - assessment.coefficient > 0 ;
--     - un rattrapage ou une note bonus n'est jamais une note de groupe ;
--     - course.prep_status ∈ (todo, in_progress, ready), les seules valeurs du code.
--   Commentaires (sans contrainte) sur les colonnes polymorphes : oral_space.subject_id,
--   progress_review.subject_id, import_ref.target_id, submission_item.batch_id.
--   Aucune ligne n'est modifiée, aucune note touchée. Rejouable.
--
-- CE QUI CHANGE POUR MARIE : rien de visible. La base refuse désormais une note négative, un
-- rattrapage ou un bonus « de groupe », et garde propres les liens attendu / question.
--
-- RETOUR ARRIÈRE : docs/schema-bdd/retour-lot2.sql
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot2.sql

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expectation_dismissal_expectation_fk') then
    alter table public.expectation_dismissal
      add constraint expectation_dismissal_expectation_fk
      foreign key (expectation_id) references public.module_expectation (id) on delete cascade
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quiz_question_criterion_question_fk') then
    alter table public.quiz_question_criterion
      add constraint quiz_question_criterion_question_fk
      foreign key (question_id) references public.question (id) on delete cascade
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'grade_value_nonneg_ck') then
    alter table public.grade
      add constraint grade_value_nonneg_ck check (value is null or value >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'grade_raw_score_nonneg_ck') then
    alter table public.grade
      add constraint grade_raw_score_nonneg_ck check (raw_score is null or raw_score >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assessment_coefficient_pos_ck') then
    alter table public.assessment
      add constraint assessment_coefficient_pos_ck check (coefficient > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'assessment_makeup_bonus_individual_ck') then
    alter table public.assessment
      add constraint assessment_makeup_bonus_individual_ck
      check (not is_group_grade or (makeup_of_id is null and not is_bonus)) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'course_prep_status_ck') then
    alter table public.course
      add constraint course_prep_status_ck
      check (prep_status in ('todo', 'in_progress', 'ready')) not valid;
  end if;
end;
$$;

-- Les index des nouvelles clés étrangères (suppression en cascade sans parcours complet).
create index if not exists expectation_dismissal_expectation_idx
  on public.expectation_dismissal (expectation_id);
create index if not exists quiz_question_criterion_question_idx
  on public.quiz_question_criterion (question_id);

-- Validation immédiate (diagnostic à 0). Échec = migration entière annulée.
alter table public.expectation_dismissal validate constraint expectation_dismissal_expectation_fk;
alter table public.quiz_question_criterion validate constraint quiz_question_criterion_question_fk;
alter table public.grade validate constraint grade_value_nonneg_ck;
alter table public.grade validate constraint grade_raw_score_nonneg_ck;
alter table public.assessment validate constraint assessment_coefficient_pos_ck;
alter table public.assessment validate constraint assessment_makeup_bonus_individual_ck;
alter table public.course validate constraint course_prep_status_ck;

comment on column public.oral_space.subject_id is
  'Polymorphe, sans clé étrangère : student.id si l''évaluation est individuelle, '
  'student_group.id si c''est une note de groupe (assessment.is_group_grade). '
  'Supprimer un·e étudiant·e ou un groupe ne supprime pas l''espace d''oral.';
comment on column public.progress_review.subject_id is
  'Polymorphe, sans clé étrangère : student.id ou student_group.id selon le point d''étape '
  '(assessment.is_group_grade).';
comment on column public.import_ref.target_id is
  'Polymorphe, sans clé étrangère : id de la ligne créée dans la table target_table.';
comment on column public.submission_item.batch_id is
  'Regroupe les éléments d''un même dépôt étudiant ; pas une clé étrangère (aucune table de lot).';
