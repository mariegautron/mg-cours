-- Diagnostic du schéma (étape 3, lot 0). LECTURE SEULE : uniquement des SELECT.
-- Aucune écriture, aucune migration. À lancer avec PGOPTIONS='-c default_transaction_read_only=on'.
-- Chaque requête est précédée d'une étiquette (\echo). Les noms de tables et de colonnes ont été
-- vérifiés dans supabase/migrations au 12 nov. 2026 (dernière migration : 20261205000000).

\pset footer on
\pset null '∅'

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 0. Migrations appliquées depuis 20261115000000 (chercher 20261123000000 en double)'
select version, name
from supabase_migrations.schema_migrations
where version >= '20261115000000'
order by version;

\echo '== 0. (suite) Versions présentes plus d''une fois'
select version, count(*) as n
from supabase_migrations.schema_migrations
group by version
having count(*) > 1
order by version;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 0b. appreciation_phrase existe-t-elle ? submission_item.replaced_at existe-t-elle ?'
select
  to_regclass('public.appreciation_phrase') is not null as appreciation_phrase_existe,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submission_item' and column_name = 'replaced_at'
  ) as submission_item_replaced_at_existe;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 1. Évaluations dont le coefficient diffère de la règle (1 si groupe, 3 si individuel)'
select m.name as module, m.year, a.title, a.type, a.exam_kind, a.is_group_grade, a.is_bonus,
       (a.makeup_of_id is not null) as est_rattrapage,
       a.coefficient,
       case when a.is_group_grade then 1 else 3 end as coef_regle,
       ss.group_coefficient as coef_groupe_ecole, ss.individual_coefficient as coef_indiv_ecole,
       (select count(*) from public.grade g where g.assessment_id = a.id and g.value is not null) as nb_notes,
       a.id as assessment_id
from public.assessment a
join public.module m on m.id = a.module_id
left join public.school_setting ss on ss.school_id = m.school_id
where a.coefficient <> case when a.is_group_grade then 1 else 3 end
order by m.name, a.title;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 2. Modules sans école'
select m.name as module, m.year, m.archived_at, m.finished_at, m.id as module_id
from public.module m
where m.school_id is null
order by m.name;

\echo '== 2. (suite) Écoles : réglage school_setting ? nom contenant « ynov » ?'
select s.name as ecole,
       (ss.id is not null) as a_un_school_setting,
       (s.name ilike '%ynov%') as nom_contient_ynov,
       ss.group_coefficient, ss.individual_coefficient, ss.bonus_allowed, ss.absence_rule,
       (select count(*) from public.module m where m.school_id = s.id) as nb_modules,
       s.id as school_id
from public.school s
left join public.school_setting ss on ss.school_id = s.id
order by s.name;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 3. Copies (grade) dont le type groupe/individuel ne correspond pas à l''évaluation'
select m.name as module, a.title, a.is_group_grade as eval_groupe,
       g.is_group_grade as copie_groupe,
       (g.student_id is not null) as copie_a_etudiant, (g.student_group_id is not null) as copie_a_groupe,
       g.value, g.id as grade_id
from public.grade g
join public.assessment a on a.id = g.assessment_id
join public.module m on m.id = a.module_id
where g.is_group_grade <> a.is_group_grade
   or (a.is_group_grade and g.student_group_id is null)
   or (not a.is_group_grade and g.student_id is null)
order by m.name, a.title;

\echo '== 3b. Notes négatives ou au-dessus du barème (max_score, ou 20 si non renseigné)'
select m.name as module, a.title, a.max_score, g.value, g.raw_score, g.id as grade_id
from public.grade g
join public.assessment a on a.id = g.assessment_id
join public.module m on m.id = a.module_id
where g.value < 0
   or g.value > coalesce(a.max_score, 20)
   or g.raw_score < 0
order by m.name, a.title;

\echo '== 3c. Rattrapages ou bonus marqués « groupe »'
select m.name as module, a.title, a.is_group_grade, a.is_bonus,
       (a.makeup_of_id is not null) as est_rattrapage, a.id as assessment_id
from public.assessment a
join public.module m on m.id = a.module_id
where a.is_group_grade and (a.makeup_of_id is not null or a.is_bonus)
order by m.name, a.title;

\echo '== 3d. Groupe noté hors du module de l''évaluation'
select m.name as module_eval, a.title, sg.name as groupe, mg.name as module_du_groupe,
       g.value, g.id as grade_id
from public.grade g
join public.assessment a on a.id = g.assessment_id
join public.module m on m.id = a.module_id
join public.student_group sg on sg.id = g.student_group_id
join public.module mg on mg.id = sg.module_id
where sg.module_id <> a.module_id
order by m.name, a.title;

\echo '== 3e. Évaluation liée à une séance d''un autre module, ou dont la date diffère de la séance'
select m.name as module_eval, a.title, a.date as date_eval,
       mc.name as module_seance, c.title as seance, c.session_date as date_seance,
       (c.module_id <> a.module_id) as autre_module,
       (a.date is distinct from c.session_date) as date_differente,
       a.id as assessment_id
from public.assessment a
join public.module m on m.id = a.module_id
join public.course c on c.id = a.course_id
join public.module mc on mc.id = c.module_id
where c.module_id <> a.module_id
   or a.date is distinct from c.session_date
order by m.name, a.title;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 4. Répartition de course.prep_status'
select prep_status, count(*) as n
from public.course
group by prep_status
order by n desc;

\echo '== 4. (suite) Répartition de (assessment.type, exam_kind)'
select type, exam_kind, is_group_grade, count(*) as n
from public.assessment
group by type, exam_kind, is_group_grade
order by type nulls first, exam_kind nulls first, is_group_grade;

\echo '== 4. (suite) Répartition de (submission_mode, submit_mode)'
select submission_mode, submit_mode, count(*) as n
from public.assessment
group by submission_mode, submit_mode
order by submission_mode nulls first, submit_mode;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 5. Attendus en double par (module, kind, label normalisé)'
select m.name as module, e.kind, lower(btrim(e.label)) as label_normalise,
       count(*) as n, array_agg(e.origin order by e.created_at) as origines,
       array_agg(e.id order by e.created_at) as ids
from public.module_expectation e
join public.module m on m.id = e.module_id
group by m.name, e.module_id, e.kind, lower(btrim(e.label))
having count(*) > 1
order by m.name, e.kind;

\echo '== 5. (suite) Rangs de séance en double par (module, position)'
select m.name as module, c.position, count(*) as n,
       array_agg(c.title order by c.session_date nulls last) as seances
from public.course c
join public.module m on m.id = c.module_id
group by m.name, c.module_id, c.position
having count(*) > 1
order by m.name, c.position;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 6. Orphelins : expectation_dismissal sans module_expectation'
select d.id, d.module_id, d.expectation_id, d.resource_id, d.created_at
from public.expectation_dismissal d
where not exists (select 1 from public.module_expectation e where e.id = d.expectation_id);

\echo '== 6. (suite) Orphelins : quiz_question_criterion sans question'
select q.id, q.quiz_id, q.question_id, q.criterion_id, q.created_at
from public.quiz_question_criterion q
where not exists (select 1 from public.question x where x.id = q.question_id);

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 7. Colonnes / tables peut-être mortes : lignes remplies sur total'
select 'student.scholar_group' as colonne,
       count(*) filter (where coalesce(btrim(scholar_group), '') <> '') as remplies, count(*) as total
from public.student
union all
select 'student.photo_url',
       count(*) filter (where coalesce(btrim(photo_url), '') <> ''), count(*)
from public.student
union all
select 'course.slides <> []',
       count(*) filter (where slides <> '[]'::jsonb), count(*)
from public.course
union all
select 'module.hours_lecture (CM)',
       count(*) filter (where hours_lecture is not null), count(*)
from public.module
union all
select 'module.hours_td (TD)',
       count(*) filter (where hours_td is not null), count(*)
from public.module
union all
select 'module.hours_tp (TP)',
       count(*) filter (where hours_tp is not null), count(*)
from public.module
union all
select 'pedagogical_outline.pdf_path',
       count(*) filter (where coalesce(btrim(pdf_path), '') <> ''), count(*)
from public.pedagogical_outline
union all
select 'invoice.pdf_path',
       count(*) filter (where coalesce(btrim(pdf_path), '') <> ''), count(*)
from public.invoice
union all
select 'invoice.xml_path',
       count(*) filter (where coalesce(btrim(xml_path), '') <> ''), count(*)
from public.invoice
union all
select 'assessment.subject_versions <> single',
       count(*) filter (where subject_versions <> 'single'), count(*)
from public.assessment
union all
select 'assessment.makeup_prepared = true',
       count(*) filter (where makeup_prepared), count(*)
from public.assessment
union all
select 'assessment.submission_mode non nul',
       count(*) filter (where submission_mode is not null), count(*)
from public.assessment
union all
select 'open_review.proposals non nul',
       count(*) filter (where proposals is not null), count(*)
from public.open_review
union all
select 'import_ref (lignes)', count(*), count(*)
from public.import_ref
union all
select 'oral_slot (lignes)', count(*), count(*)
from public.oral_slot
union all
select 'project_submission (lignes)', count(*), count(*)
from public.project_submission
union all
select 'project_submission sans lien (non reprises en rendus)',
       count(*) filter (where coalesce(btrim(url), '') = ''), count(*)
from public.project_submission;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 8. Sources de « progression envoyée » et de « facture », module par module'
select m.name as module, m.year,
       m.iceberg_state,
       (m.admin_docs ->> 'progression_pedagogique')::boolean as admin_docs_progression,
       po.status as outline_status, po.sent_at as outline_sent_at,
       (select count(*) from public.module_document d
         where d.module_id = m.id and d.kind = 'outline_sent') as docs_outline_sent,
       (select count(*) from public.invoice i where i.module_id = m.id) as nb_invoice,
       (select string_agg(i.number || ':' || i.status::text, ', ' order by i.number)
          from public.invoice i where i.module_id = m.id) as invoices,
       (select max(i.sent_at) from public.invoice i where i.module_id = m.id) as invoice_sent_at,
       (select max(i.paid_on) from public.invoice i where i.module_id = m.id) as invoice_paid_on,
       it.sent_on as tracking_sent_on, it.paid_on as tracking_paid_on,
       (select count(*) from public.module_document d
         where d.module_id = m.id and d.kind = 'external_invoice') as docs_external_invoice
from public.module m
left join public.pedagogical_outline po on po.module_id = m.id
left join public.invoice_tracking it on it.module_id = m.id
order by m.year, m.name;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 9. Numéros de facture, dans l''ordre'
select i.number, i.issued_on, i.status, i.amount_inc_vat, m.name as module,
       (i.snapshot is not null) as a_un_snapshot
from public.invoice i
join public.module m on m.id = i.module_id
order by i.owner_id, i.number;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
\echo '== 10. Empreinte des notes (référence avant le lot 1) : nombre et somme par module'
select m.name as module, m.year,
       count(g.id) filter (where g.value is not null) as nb_notes,
       coalesce(sum(g.value), 0) as somme_notes,
       count(g.id) as nb_copies
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.id, m.name, m.year
order by m.year, m.name;
