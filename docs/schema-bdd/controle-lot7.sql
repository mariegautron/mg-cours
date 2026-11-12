-- Contrôle du lot 7 (unicités). LECTURE SEULE : uniquement des SELECT.
-- AVANT `db push` : les requêtes 2 et 3 doivent renvoyer 0 ligne (sinon la migration échouera :
-- ne pas pousser, me prévenir). APRÈS : la requête 1 liste l'index et la contrainte.

\pset null '∅'

\echo '== 1. Index et contrainte du lot 7 (après : 2 lignes)'
select 'index' as genre, indexname as nom, indexdef as definition
from pg_indexes where schemaname = 'public' and indexname = 'module_expectation_label_uidx'
union all
select 'contrainte', conname,
       pg_get_constraintdef(oid) || case when condeferrable then ' (deferrable'
         || case when condeferred then ', initially deferred)' else ')' end else '' end
from pg_constraint where conname = 'course_module_position_key';

\echo '== 2. Attendus en double (doit être 0)'
select e.module_id, e.kind, lower(btrim(e.label)) as label, count(*)
from public.module_expectation e
group by 1, 2, 3 having count(*) > 1;

\echo '== 3. Rangs de séance en double (doit être 0)'
select c.module_id, c.position, count(*)
from public.course c
group by 1, 2 having count(*) > 1;

\echo '== 4. Rangs négatifs (doit être 0 : un déplacement interrompu en laisserait)'
select c.module_id, c.position, c.title from public.course c where c.position <= 0;

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
