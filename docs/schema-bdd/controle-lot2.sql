-- Contrôle du lot 2 (clés étrangères et contrôles). LECTURE SEULE : uniquement des SELECT.
-- AVANT `db push` : les requêtes 2 à 6 doivent toutes renvoyer 0 ligne (sinon la migration
-- échouera à la validation et ne s'appliquera pas du tout : ne pas pousser, me prévenir).
-- APRÈS : la requête 1 liste les 7 contraintes avec convalidated = t ; empreinte identique.

\pset null '∅'

\echo '== 1. Contraintes du lot 2 (après : 7 lignes, toutes validées)'
select conrelid::regclass as table_name, conname, convalidated
from pg_constraint
where conname in ('expectation_dismissal_expectation_fk', 'quiz_question_criterion_question_fk',
                  'grade_value_nonneg_ck', 'grade_raw_score_nonneg_ck',
                  'assessment_coefficient_pos_ck', 'assessment_makeup_bonus_individual_ck',
                  'course_prep_status_ck')
order by 1, 2;

\echo '== 2. Attendus écartés orphelins (doit être 0)'
select d.id from public.expectation_dismissal d
where not exists (select 1 from public.module_expectation e where e.id = d.expectation_id);

\echo '== 3. Critères de question orphelins (doit être 0)'
select q.id from public.quiz_question_criterion q
where not exists (select 1 from public.question x where x.id = q.question_id);

\echo '== 4. Notes négatives (doit être 0)'
select g.id, g.value, g.raw_score from public.grade g where g.value < 0 or g.raw_score < 0;

\echo '== 5. Coefficient <= 0, ou rattrapage / bonus de groupe (doit être 0)'
select a.id, a.title, a.coefficient, a.is_group_grade, a.is_bonus, a.makeup_of_id
from public.assessment a
where a.coefficient <= 0 or (a.is_group_grade and (a.makeup_of_id is not null or a.is_bonus));

\echo '== 6. Séances au statut de préparation inconnu (doit être 0)'
select c.id, c.prep_status from public.course c
where c.prep_status not in ('todo', 'in_progress', 'ready');

\echo '== Empreinte des notes : nombre et somme par module (doit être identique)'
select m.name as module, m.year,
       count(g.id) filter (where g.value is not null) as nb_notes,
       coalesce(sum(g.value), 0) as somme_notes,
       count(g.id) as nb_copies
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.id, m.name, m.year
order by m.year, m.name;
