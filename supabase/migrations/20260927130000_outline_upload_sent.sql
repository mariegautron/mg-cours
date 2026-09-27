-- Rattrapage US-70 : une trame déposée (document « outline_sent ») vaut trame envoyée.
-- L'état iceberg avance jusqu'à 'outline_sent' sans reculer (comparaison selon l'ordre
-- de déclaration de l'enum public.iceberg_state) et la progression pédagogique est cochée.

update public.module m
set
  iceberg_state = greatest(m.iceberg_state, 'outline_sent'::public.iceberg_state),
  admin_docs = m.admin_docs || jsonb_build_object('progression_pedagogique', true)
where exists (
  select 1
  from public.module_document d
  where d.module_id = m.id
    and d.kind = 'outline_sent'
);
