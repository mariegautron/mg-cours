-- Contrôle du lot 3 (coefficient_override). LECTURE SEULE : uniquement des SELECT.
-- À lancer AVANT puis APRÈS `db push`. Tout doit être IDENTIQUE, sauf la requête 1 qui passe
-- de « colonne absente » à « colonne présente, 0 ligne remplie ».

\pset null '∅'

\echo '== 1. coefficient_override : présente ? lignes remplies (doit être 0)'
select exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'assessment'
                 and column_name = 'coefficient_override') as colonne_presente,
       (select count(*) from public.assessment a
         where (to_jsonb(a) ->> 'coefficient_override') is not null) as lignes_remplies;

\echo '== 2. Moyennes de référence, modules Agile/Scrum et TEST (règle ×1 groupe / ×3 individuel)'
\echo '   Calcul simplifié (sans absences ni bonus) : sert seulement à comparer avant / après.'
with a as (
  select a.id, a.module_id, a.is_group_grade, a.is_bonus,
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
