-- US-57 : le statut d'une ressource est toujours renseigné (garde-fou de projection).
update public.resource set status = 'ready' where status is null;

alter table public.resource
  alter column status set default 'ready',
  alter column status set not null;
