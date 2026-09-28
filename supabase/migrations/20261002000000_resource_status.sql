-- US-57: Ressource "a construire"
-- Ajout du statut (progress/ready) et de la note d'intention

create type public.resource_status as enum (
  'progress', -- a construire
  'ready'     -- prete
);

alter table public.resource
  add column status public.resource_status default 'ready',
  add column intent_note text;

select public.mg_apply_conventions(array['resource']);
