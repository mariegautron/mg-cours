-- Contrôle du lot 1 (conventions). LECTURE SEULE : uniquement des SELECT.
-- À lancer AVANT puis APRÈS `db push`. Avant : updated_at absent, mg_owner_all absente.
-- Après : les 4 tables ont updated_at, les 3 tables ont mg_owner_all et set_updated_at.
-- L'empreinte des notes (dernière requête) doit être IDENTIQUE avant et après.

\pset null '∅'

\echo '== 1. Colonne updated_at sur les 4 tables'
select t.table_name,
       exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = t.table_name
                 and c.column_name = 'updated_at') as a_updated_at
from (values ('assessment_expectation'), ('expectation_dismissal'),
             ('expectation_resource'), ('quiz_question_criterion')) as t(table_name)
order by 1;

\echo '== 2. Politiques et déclencheurs'
select t.table_name,
       (select string_agg(p.policyname, ', ' order by p.policyname) from pg_policies p
         where p.schemaname = 'public' and p.tablename = t.table_name) as politiques,
       (select string_agg(tg.tgname, ', ' order by tg.tgname) from pg_trigger tg
         where tg.tgrelid = to_regclass('public.' || t.table_name) and not tg.tgisinternal) as declencheurs,
       (select c.relrowsecurity from pg_class c
         where c.oid = to_regclass('public.' || t.table_name)) as rls_active
from (values ('assessment_expectation'), ('expectation_dismissal'),
             ('expectation_resource'), ('quiz_question_criterion')) as t(table_name)
order by 1;

\echo '== 3. Nombre de lignes (inchangé avant / après)'
select 'assessment_expectation' as table_name, count(*) from public.assessment_expectation
union all select 'expectation_dismissal', count(*) from public.expectation_dismissal
union all select 'expectation_resource', count(*) from public.expectation_resource
union all select 'quiz_question_criterion', count(*) from public.quiz_question_criterion;

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
