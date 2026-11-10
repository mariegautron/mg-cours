-- Doublons, lot 6 : archivage (PAS de suppression) des morceaux de cours importés de Notion qui ne
-- servent dans aucun déroulé (environ 220, choix d'Arnaud du 10 nov. 2026). Un « morceau » a un titre
-- de la forme « Cours — partie » (même règle que l'appli). Seule la colonne archived_at change ; les
-- morceaux utilisés dans un déroulé ne sont pas touchés. Contrôle : docs/doublons/lot6-controle.sql.
--
-- Horodatage fixe, pour retrouver exactement ces lignes. Pour TOUT désarchiver :
--   update public.resource set archived_at = null
--   where archived_at = '2026-11-10 22:00:00+00';

update public.resource r
set archived_at = '2026-11-10 22:00:00+00'
where r.archived_at is null
  and r.title ~ '\s[—–]\s'
  and exists (
    select 1 from public.import_ref i
    where i.source = 'notion' and i.target_table = 'resource' and i.target_id = r.id
  )
  and not exists (select 1 from public.course_resource cr where cr.resource_id = r.id);
