-- Contrôle du lot 6 (doublons de sens). LECTURE SEULE : uniquement des SELECT.
-- AVANT puis APRÈS `db push` : seule la requête 1 change (défaut sans progression_pedagogique).
-- Toutes les autres doivent être IDENTIQUES : la migration ne modifie aucune ligne.

\pset null '∅'

\echo '== 1. Défaut de module.admin_docs'
select column_default from information_schema.columns
where table_schema = 'public' and table_name = 'module' and column_name = 'admin_docs';

\echo '== 2. Progression envoyée, module par module (les 3 sources ; envoyee = au moins une)'
select m.name, m.year,
       (po.status in ('sent', 'validated') or po.sent_at is not null) as outline_marquee,
       exists (select 1 from public.module_document d
               where d.module_id = m.id and d.kind = 'outline_sent') as pdf_depose,
       coalesce((m.admin_docs ->> 'progression_pedagogique')::boolean, false) as ancienne_case,
       (coalesce(po.status in ('sent', 'validated') or po.sent_at is not null, false)
        or exists (select 1 from public.module_document d
                   where d.module_id = m.id and d.kind = 'outline_sent')
        or coalesce((m.admin_docs ->> 'progression_pedagogique')::boolean, false)) as envoyee
from public.module m
left join public.pedagogical_outline po on po.module_id = m.id
order by m.year, m.name;

\echo '== 3. Évaluations dont la date diffère de leur séance (6 attendues, NON corrigées)'
select m.name as module, a.title, a.date, c.session_date
from public.assessment a
join public.module m on m.id = a.module_id
join public.course c on c.id = a.course_id
where a.date is distinct from c.session_date
order by m.name, a.title;

\echo '== 4. submission_mode / submit_mode (inchangés : 4 submission_mode remplis)'
select submission_mode, submit_mode, count(*) from public.assessment
group by 1, 2 order by 1 nulls first, 2;

\echo '== 5. Heures CM/TD/TP gardées (7 / 7 / 1 attendus)'
select count(hours_lecture) as cm, count(hours_td) as td, count(hours_tp) as tp from public.module;

\echo '== 6. Promotions : étudiant·es avec student.scholar_group mais sans aucune promo dans student_year'
\echo '   (la recherche ne lit plus que student_year : ces personnes perdraient leur promo affichée)'
select s.last_name, s.first_name, s.scholar_group
from public.student s
where coalesce(btrim(s.scholar_group), '') <> ''
  and not exists (select 1 from public.student_year y
                  where y.student_id = s.id and coalesce(btrim(y.scholar_group), '') <> '')
order by s.last_name, s.first_name;

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
