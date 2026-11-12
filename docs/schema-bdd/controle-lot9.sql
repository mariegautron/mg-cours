-- Contrôle du lot 9 (suppressions). LECTURE SEULE : uniquement des SELECT.
-- AVANT `db push` : requête 1 = 9 colonnes présentes + project_submission ; requête 2 = 3
-- politiques ; requête 3 = 0 (sinon la migration échouera : ne pas pousser, me prévenir).
-- APRÈS : requêtes 1 et 2 vides ; empreinte des notes et moyennes de référence IDENTIQUES.

\pset null '∅'

\echo '== 1. Colonnes et table supprimées par le lot 9 (après : 0 ligne)'
select table_name || '.' || column_name as objet
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('course', 'slides'), ('student', 'photo_url'), ('student', 'scholar_group'),
    ('open_review', 'proposals'), ('invoice', 'pdf_path'), ('invoice', 'xml_path'),
    ('grade', 'is_group_grade'), ('assessment', 'coefficient'), ('assessment', 'submission_mode'))
union all
select 'table project_submission' where to_regclass('public.project_submission') is not null
order by 1;

\echo '== 2. Anciennes politiques *_owner (après : 0 ligne)'
select tablename, policyname from pg_policies
where schemaname = 'public'
  and policyname in ('assessment_expectation_owner', 'expectation_dismissal_owner', 'expectation_resource_owner');

\echo '== 2b. mg_owner_all toujours là sur les 3 tables (avant et après : 3 lignes)'
select tablename, policyname from pg_policies
where schemaname = 'public' and policyname = 'mg_owner_all'
  and tablename in ('assessment_expectation', 'expectation_dismissal', 'expectation_resource')
order by 1;

\echo '== 3. Garde : promotions seulement dans student.scholar_group (avant : doit être 0)'
select count(*) as sans_promo_dans_student_year
from public.student s
where exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'student' and column_name = 'scholar_group')
  and coalesce(btrim(to_jsonb(s) ->> 'scholar_group'), '') <> ''
  and not exists (select 1 from public.student_year y
                  where y.student_id = s.id and coalesce(btrim(y.scholar_group), '') <> '');

\echo '== 4. Colonnes gardées (toujours présentes après : 6 lignes)'
select table_name || '.' || column_name as garde
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('assessment', 'exam_kind'), ('assessment', 'subject_versions'), ('assessment', 'makeup_prepared'),
    ('pedagogical_outline', 'pdf_path'), ('module', 'hours_lecture'), ('module', 'hours_td'))
order by 1;

\echo '== 5. Moyennes de référence, modules Agile/Scrum et TEST (règle ×1 groupe / ×3 individuel)'
with a as (
  select a.id, a.module_id,
         coalesce(a.max_score,
                  (select sum(c.weight) from public.grid_criterion c
                    where c.grading_grid_id = a.grading_grid_id and not c.is_bonus),
                  20) as max_pts,
         case when a.is_group_grade then 1 else 3 end as coef
  from public.assessment a
  join public.module m on m.id = a.module_id
  where (m.name ilike '%scrum%' or m.name ilike 'TEST%') and not a.is_bonus
),
notes as (
  select a.module_id, coalesce(g.student_id, gm.student_id) as student_id,
         g.value * 20.0 / nullif(a.max_pts, 0) as sur20, a.coef
  from a
  join public.grade g on g.assessment_id = a.id and g.value is not null
  left join public.group_member gm on gm.student_group_id = g.student_group_id
)
select m.name as module, m.year, s.last_name, s.first_name,
       count(*) as nb_notes, round(sum(n.sur20 * n.coef) / sum(n.coef), 2) as moyenne
from notes n
join public.module m on m.id = n.module_id
join public.student s on s.id = n.student_id
group by m.name, m.year, s.last_name, s.first_name
order by m.name, m.year, s.last_name, s.first_name;

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
