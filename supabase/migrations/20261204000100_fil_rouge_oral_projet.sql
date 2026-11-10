-- Lot 4b, suite : l'oral individuel de fin d'année du module « Fil Rouge FullStack : Cadrage »
-- (« Fil Rouge FullStack : phase 1 … ») est la finalité du projet fil rouge : il est rattaché au
-- projet du module, avec le rôle « oral » (oral de fin de projet). Il reste une évaluation notée
-- « Oral individuel » : ni son type, ni ses notes, ni son coefficient ne changent.
-- Ciblé sur cette seule évaluation (titre et module), seulement si elle n'a pas encore de projet et
-- si le module a exactement un projet. Rejouable. Réversible :
--   update public.assessment set project_id = null, project_role = null where title like 'Fil Rouge FullStack : phase 1%';

update public.assessment a
set project_id = p.id,
    project_role = coalesce(a.project_role, 'oral')
from public.module_project p, public.module m
where p.module_id = a.module_id
  and m.id = a.module_id
  and m.name = 'Fil Rouge FullStack : Cadrage'
  and a.title like 'Fil Rouge FullStack : phase 1%'
  and a.project_id is null
  and (select count(*) from public.module_project x where x.module_id = a.module_id) = 1;
