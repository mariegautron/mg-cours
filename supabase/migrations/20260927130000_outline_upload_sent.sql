-- Rattrapage US-70 : une progression pédagogique déposée (document « outline_sent ») vaut
-- progression envoyée. L'état iceberg avance jusqu'à 'outline_sent' sans reculer
-- (greatest() compare selon l'ordre de déclaration de l'enum public.iceberg_state, vérifié :
-- fiche_received < … < outline_sent < … < paid).

update public.module m
set iceberg_state = greatest(m.iceberg_state, 'outline_sent'::public.iceberg_state)
where exists (
  select 1
  from public.module_document d
  where d.module_id = m.id
    and d.kind = 'outline_sent'
);
