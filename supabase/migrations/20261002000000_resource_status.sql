-- US-57: Ressource "a construire"
-- Ajout du statut (progress/ready) et de la note d'intention
-- Table existante : RLS et trigger updated_at deja en place (pas de mg_apply_conventions).

do $$
begin
  create type public.resource_status as enum (
    'progress', -- a construire
    'ready'     -- prete
  );
exception
  when duplicate_object then null;
end
$$;

alter table public.resource
  add column if not exists status public.resource_status default 'ready',
  add column if not exists intent_note text;
