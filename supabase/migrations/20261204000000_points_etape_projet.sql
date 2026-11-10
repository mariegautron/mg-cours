-- Lot 4b (doublons D15) : les points d'étape NON notés sans projet sont rattachés au projet fil
-- rouge de leur module. Seul le lien `project_id` est mis à jour : ni le type, ni la case « Noté »,
-- ni le rôle, ni aucune note ne changent. Un module sans projet (ou, par sécurité, avec plusieurs)
-- n'est pas touché ; ces cas sont listés par docs/doublons/lot4b-controle.sql (requête 2).
-- Réversible : `update public.assessment set project_id = null where id in (…)` sur les lignes
-- listées par la requête 1 du contrôle avant la migration. Rejouable : ne touche que les lignes
-- encore sans projet.

update public.assessment a
set project_id = p.id
from public.module_project p
where p.module_id = a.module_id
  and a.type ~* '(é|e)tape'
  and not a.review_graded
  and a.project_id is null
  and (select count(*) from public.module_project x where x.module_id = a.module_id) = 1;
