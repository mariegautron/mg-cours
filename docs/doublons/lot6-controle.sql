-- LECTURE SEULE. Doublons, lot 6 (D26 mini-QCM, D28 ressources retenues, morceaux Notion).
-- À lancer en prod avec la commande psql en lecture seule. Rien n'est modifié : ces chiffres
-- servent à Arnaud pour décider, avant toute recopie ou tout tri.
-- Familles (comme l'appli) : Cours = course ; Ateliers = workshop ; Évaluations = project, template,
-- answer_key ; QCM = question_bank ; sans famille = reference, teacher_notes ou non classée.

-- ── 1) Bibliothèque par famille : combien, archivées ou non, utilisées dans un déroulé ou non ───
with r as (
  select res.*,
         case
           when res.kind = 'course' then 'Cours'
           when res.kind = 'workshop' then 'Ateliers'
           when res.kind in ('project', 'template', 'answer_key') then 'Évaluations'
           when res.kind = 'question_bank' then 'QCM (mini-QCM)'
           else 'Sans famille'
         end as famille,
         exists (select 1 from public.course_resource cr where cr.resource_id = res.id) as dans_un_deroule
  from public.resource res
)
select famille,
       count(*)                                                as ressources,
       count(*) filter (where archived_at is not null)         as archivees,
       count(*) filter (where dans_un_deroule)                 as dans_un_deroule,
       count(*) filter (where not dans_un_deroule)             as dans_aucun_deroule
from r
group by famille
order by famille;

-- ── 2) Morceaux importés de Notion (import_ref source « notion »), par famille ────────────────
-- « morceau » = titre de la forme « Cours — partie » (même règle que l'appli).
with n as (
  select res.*,
         case
           when res.kind = 'course' then 'Cours'
           when res.kind = 'workshop' then 'Ateliers'
           when res.kind in ('project', 'template', 'answer_key') then 'Évaluations'
           when res.kind = 'question_bank' then 'QCM (mini-QCM)'
           else 'Sans famille'
         end as famille,
         res.title ~ '\s[—–]\s' as morceau,
         exists (select 1 from public.course_resource cr where cr.resource_id = res.id) as dans_un_deroule
  from public.resource res
  where exists (
    select 1 from public.import_ref i
    where i.source = 'notion' and i.target_table = 'resource' and i.target_id = res.id
  )
)
select famille,
       count(*)                                        as importees_notion,
       count(*) filter (where morceau)                 as dont_morceaux,
       count(*) filter (where dans_un_deroule)         as dans_un_deroule,
       count(*) filter (where not dans_un_deroule)     as dans_aucun_deroule,
       count(*) filter (where archived_at is not null) as archivees
from n
group by famille
order by famille;

-- Total des morceaux (titre « Cours — partie »), importés de Notion ou non
select count(*) as morceaux,
       count(*) filter (where exists (
         select 1 from public.course_resource cr where cr.resource_id = res.id
       )) as dans_un_deroule
from public.resource res
where res.title ~ '\s[—–]\s';

-- ── 3) Mini-QCM (famille QCM) : questions déjà liées dans la banque ou non ───────────────────
select res.title as mini_qcm,
       res.archived_at is not null as archivee,
       (select count(*) from public.resource_question rq where rq.resource_id = res.id) as questions_liees_banque,
       exists (select 1 from public.course_resource cr where cr.resource_id = res.id) as dans_un_deroule,
       length(coalesce(res.content, ''))                                      as taille_contenu
from public.resource res
where res.kind = 'question_bank'
order by res.title;

-- ── 4) Ressources « retenues » (module_resource) qui ne sont dans AUCUN déroulé du module ──────
select m.name as module, res.title as ressource, res.kind,
       mr.created_at::date as retenue_le
from public.module_resource mr
join public.module m on m.id = mr.module_id
join public.resource res on res.id = mr.resource_id
where not exists (
  select 1 from public.course_resource cr
  join public.course c on c.id = cr.course_id
  where cr.resource_id = mr.resource_id and c.module_id = mr.module_id
)
order by m.name, res.title;

-- Total retenues / dont dans aucun déroulé
select count(*) as retenues,
       count(*) filter (where not exists (
         select 1 from public.course_resource cr
         join public.course c on c.id = cr.course_id
         where cr.resource_id = mr.resource_id and c.module_id = mr.module_id
       )) as dans_aucun_deroule
from public.module_resource mr;
