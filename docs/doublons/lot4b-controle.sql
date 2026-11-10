-- LECTURE SEULE. Lot 4b : points d'étape « Hors projet ». À lancer dans l'éditeur SQL Supabase
-- (prod) AVANT puis APRÈS la migration 20261204000000_points_etape_projet.sql. Rien n'est modifié.
-- Un point d'étape = une évaluation dont le type contient « étape » (même règle que l'appli).

-- ── 1) Points d'étape et évaluations du « Fil Rouge », avec leur rattachement au projet ──────────
-- AVANT : les points d'étape non notés sans projet ont « projet_rattache » vide et
-- « sera_rattache » = oui. APRÈS : « projet_rattache » est rempli, plus aucun « oui ».
select m.name                                         as module,
       a.title                                        as evaluation,
       a.type,
       a.review_graded                                as note,
       p.title                                        as projet_rattache,
       (select count(*) from public.module_project x where x.module_id = a.module_id)
                                                      as projets_du_module,
       (select count(*) from public.grade g
         where g.assessment_id = a.id and g.value is not null) as notes,
       case
         when a.type ~* '(é|e)tape' and not a.review_graded and a.project_id is null
              and (select count(*) from public.module_project x where x.module_id = a.module_id) = 1
           then 'oui'
         else ''
       end                                            as sera_rattache
from public.assessment a
join public.module m on m.id = a.module_id
left join public.module_project p on p.id = a.project_id
where a.type ~* '(é|e)tape'
   or m.name ilike '%fil rouge%'
order by m.name, a.date nulls last, a.title;

-- ── 2) Cas laissés de côté : point d'étape non noté sans projet, module sans projet ou avec
--       plusieurs projets (ne devrait pas arriver : un seul projet par module). À montrer à Arnaud.
select m.name as module, a.title as evaluation,
       (select count(*) from public.module_project x where x.module_id = a.module_id) as projets
from public.assessment a
join public.module m on m.id = a.module_id
where a.type ~* '(é|e)tape' and not a.review_graded and a.project_id is null
  and (select count(*) from public.module_project x where x.module_id = a.module_id) <> 1
order by m.name, a.title;

-- ── 3) Nombre de points d'étape que la migration va rattacher. AVANT : N ; APRÈS : 0 ──────────
select count(*) as a_rattacher
from public.assessment a
where a.type ~* '(é|e)tape' and not a.review_graded and a.project_id is null
  and (select count(*) from public.module_project x where x.module_id = a.module_id) = 1;

-- ── 4) Empreinte des notes et des types : identique AVANT et APRÈS ─────────────────────────────
select m.name as module,
       count(distinct a.id)                                   as evaluations,
       count(distinct a.id) filter (where a.type ~* '(é|e)tape') as points_d_etape,
       count(distinct a.id) filter (where a.review_graded)    as cases_note_cochees,
       count(g.value)                                         as notes,
       coalesce(sum(g.value), 0)                              as somme_notes
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.name
order by m.name;
