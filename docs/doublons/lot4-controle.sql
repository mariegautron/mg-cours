-- LECTURE SEULE. Doublons, lot 4 (D15, points d'étape). À lancer dans l'éditeur SQL Supabase
-- (prod). Rien n'est modifié. Le lot 4 n'a PAS de migration : ces chiffres servent à vérifier que
-- rien n'est perdu en retirant la case « Jalon du projet fil rouge » et les « phases ».

-- ── 1) Évaluations rattachées au projet fil rouge (ce que cochait la case « Jalon ») ─────────────
-- La case est retirée du formulaire ; le rattachement existant (project_id, project_role) n'est
-- PAS touché : ces évaluations restent dans le projet, avec leurs notes.
select m.name as module,
       coalesce(a.project_role::text, '(sans rôle)')                as role,
       count(distinct a.id)                                          as evaluations,
       count(distinct a.id) filter (where a.type ~* '(é|e)tape')     as dont_points_d_etape,
       count(g.id) filter (where g.value is not null)                as notes
from public.assessment a
join public.module m on m.id = a.module_id
left join public.grade g on g.assessment_id = a.id
where a.project_id is not null
group by m.name, a.project_role
order by m.name, role;

-- Total : évaluations « cochées Jalon » (rattachées au projet avec le rôle « milestone »)
select count(*) as evaluations_jalon,
       count(*) filter (where exists (
         select 1 from public.grade g where g.assessment_id = a.id and g.value is not null
       )) as dont_avec_notes
from public.assessment a
where a.project_role = 'milestone';

-- ── 2) « Phases » du projet ──────────────────────────────────────────────────────────────────
-- Les phases ne sont pas une table : ce sont des lignes de la section « Phases… » du brief du
-- projet (module_project.brief_md). Le brief n'est PAS modifié : seul le bouton « Noter la phase »
-- (déjà plus affiché) et son code sont retirés.
-- a) Projets dont le brief parle de phases, par module
select m.name as module, p.title as projet,
       (select count(*) from regexp_matches(p.brief_md, '(^|\n)\s*(\d+\s*[.)°]|[-*+•])\s+', 'g'))
         as lignes_de_liste_du_brief
from public.module_project p
join public.module m on m.id = p.module_id
where p.brief_md ~* 'phase'
order by m.name;

-- b) Évaluations créées par « Noter la phase » (jalon de groupe de type « projet ») : elles
--    restent des évaluations ordinaires du projet, avec leurs notes.
select m.name as module, a.title as evaluation,
       (select count(*) from public.grade g where g.assessment_id = a.id and g.value is not null)
         as notes
from public.assessment a
join public.module m on m.id = a.module_id
where a.project_role = 'milestone' and a.type = 'projet'
order by m.name, a.project_position;

-- ── 3) Points d'étape : notés / non notés, par module (la notion gardée) ──────────────────────
select m.name as module,
       count(*) filter (where a.review_graded)     as points_d_etape_notes,
       count(*) filter (where not a.review_graded) as points_d_etape_non_notes
from public.assessment a
join public.module m on m.id = a.module_id
where a.type ~* '(é|e)tape'
group by m.name
order by m.name;

-- ── 4) Empreinte des notes : identique avant et après le déploiement du lot 4 ────────────────
select m.name as module, count(g.value) as notes, coalesce(sum(g.value), 0) as somme_notes
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.name
order by m.name;
