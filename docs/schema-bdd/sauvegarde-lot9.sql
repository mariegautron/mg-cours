-- Sauvegarde AVANT le lot 9 (suppressions). LECTURE SEULE : uniquement des \copy (select …).
-- À lancer depuis le dossier de sauvegarde (la commande le crée et s'y place) : les fichiers CSV
-- sont écrits dans le dossier courant. Une ligne par valeur non vide, avec l'id pour la restaurer.
-- Ces CSV contiennent des données d'étudiant·es : ne pas les ajouter au dépôt git.

\pset null '∅'

\echo '== student.scholar_group'
\copy (select id, last_name, first_name, scholar_group from public.student where coalesce(btrim(scholar_group), '') <> '' order by last_name, first_name) to 'student_scholar_group.csv' csv header
\echo '== student.photo_url'
\copy (select id, photo_url from public.student where coalesce(btrim(photo_url), '') <> '') to 'student_photo_url.csv' csv header
\echo '== course.slides'
\copy (select id, slides from public.course where slides <> '[]'::jsonb) to 'course_slides.csv' csv header
\echo '== open_review.proposals'
\copy (select id, proposals from public.open_review where proposals is not null) to 'open_review_proposals.csv' csv header
\echo '== invoice.pdf_path / xml_path'
\copy (select id, pdf_path, xml_path from public.invoice where pdf_path is not null or xml_path is not null) to 'invoice_pdf_xml_path.csv' csv header
\echo '== grade.is_group_grade'
\copy (select id, is_group_grade from public.grade where is_group_grade) to 'grade_is_group_grade.csv' csv header
\echo '== assessment.coefficient (toutes les lignes : aucune n''est vide)'
\copy (select id, title, coefficient from public.assessment order by title) to 'assessment_coefficient.csv' csv header
\echo '== assessment.submission_mode'
\copy (select id, title, submission_mode from public.assessment where submission_mode is not null) to 'assessment_submission_mode.csv' csv header
\echo '== table project_submission (entière)'
\copy (select * from public.project_submission) to 'project_submission.csv' csv header
\echo '== anciennes politiques *_owner (définitions)'
\copy (select tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'public' and policyname in ('assessment_expectation_owner', 'expectation_dismissal_owner', 'expectation_resource_owner')) to 'politiques_owner.csv' csv header

\echo '== Nombre de lignes sauvegardées par fichier (à comparer avec wc -l, en-tête compris)'
select 'student_scholar_group' as fichier, count(*) from public.student where coalesce(btrim(scholar_group), '') <> ''
union all select 'student_photo_url', count(*) from public.student where coalesce(btrim(photo_url), '') <> ''
union all select 'course_slides', count(*) from public.course where slides <> '[]'::jsonb
union all select 'open_review_proposals', count(*) from public.open_review where proposals is not null
union all select 'invoice_pdf_xml_path', count(*) from public.invoice where pdf_path is not null or xml_path is not null
union all select 'grade_is_group_grade', count(*) from public.grade where is_group_grade
union all select 'assessment_coefficient', count(*) from public.assessment
union all select 'assessment_submission_mode', count(*) from public.assessment where submission_mode is not null
union all select 'project_submission', count(*) from public.project_submission;

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
