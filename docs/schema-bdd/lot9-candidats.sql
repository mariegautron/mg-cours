-- Lot 9 (préparation) : pour chaque colonne / table candidate à la suppression, le nombre de
-- lignes remplies. LECTURE SEULE : uniquement des SELECT. Aucun drop ici : Arnaud décide colonne
-- par colonne, d'après docs/schema-bdd/lot9-candidats.md.

\pset null '∅'

\echo '== 1. Colonnes candidates : lignes remplies / total'
select 'assessment.coefficient (≠ 1)' as candidat,
       count(*) filter (where coefficient <> 1) as remplies, count(*) as total
from public.assessment
union all
select 'assessment.submission_mode', count(*) filter (where submission_mode is not null), count(*)
from public.assessment
union all
select 'assessment.exam_kind', count(*) filter (where exam_kind is not null), count(*)
from public.assessment
union all
select 'assessment.exam_kind ≠ celui déduit de kind',
       count(*) filter (where kind is not null and exam_kind is distinct from case kind
         when 'files' then 'files' when 'progress_review' then 'files'
         when 'quiz' then 'qcm' when 'open_questions' then 'qcm'
         when 'oral' then 'oral' when 'in_class' then 'in_class' else null end), count(*)
from public.assessment
union all
select 'assessment.subject_versions ≠ single', count(*) filter (where subject_versions <> 'single'), count(*)
from public.assessment
union all
select 'assessment.makeup_prepared = true', count(*) filter (where makeup_prepared), count(*)
from public.assessment
union all
select 'grade.is_group_grade = true', count(*) filter (where is_group_grade), count(*)
from public.grade
union all
select 'student.scholar_group', count(*) filter (where coalesce(btrim(scholar_group), '') <> ''), count(*)
from public.student
union all
select 'student.photo_url', count(*) filter (where coalesce(btrim(photo_url), '') <> ''), count(*)
from public.student
union all
select 'course.slides ≠ []', count(*) filter (where slides <> '[]'::jsonb), count(*)
from public.course
union all
select 'project_submission (table)', count(*), count(*)
from public.project_submission
union all
select 'open_review.proposals', count(*) filter (where proposals is not null), count(*)
from public.open_review
union all
select 'invoice.pdf_path', count(*) filter (where coalesce(btrim(pdf_path), '') <> ''), count(*)
from public.invoice
union all
select 'invoice.xml_path', count(*) filter (where coalesce(btrim(xml_path), '') <> ''), count(*)
from public.invoice
union all
select 'pedagogical_outline.pdf_path', count(*) filter (where coalesce(btrim(pdf_path), '') <> ''), count(*)
from public.pedagogical_outline
union all
select 'import_ref (table)', count(*), count(*)
from public.import_ref;

\echo '== 2. Promotions : scholar_group de student absent de student_year (perte si suppression)'
select count(*) as sans_equivalent
from public.student s
where coalesce(btrim(s.scholar_group), '') <> ''
  and not exists (select 1 from public.student_year y
                  where y.student_id = s.id and btrim(y.scholar_group) = btrim(s.scholar_group));

\echo '== 3. Anciennes politiques « *_owner » (doublons de mg_owner_all)'
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and policyname like '%\_owner' escape '\'
order by tablename;

\echo '== 4. import_ref : répartition par source et table cible'
select source, target_table, count(*) from public.import_ref group by 1, 2 order by 1, 2;

\echo '== Empreinte des notes : nombre et somme par module'
select m.name as module, m.year,
       count(g.id) filter (where g.value is not null) as nb_notes,
       coalesce(sum(g.value), 0) as somme_notes,
       count(g.id) as nb_copies
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.id, m.name, m.year
order by m.year, m.name;
