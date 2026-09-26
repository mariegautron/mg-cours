-- Historique des ressources (US-04) : à chaque modification du contenu, l'état précédent est
-- conservé dans resource_version (30 versions max par ressource). Restaurer = ré-écrire la ressource
-- avec une ancienne version (l'état courant est alors lui-même sauvegardé).

create table public.resource_version (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resource_id uuid not null references public.resource (id) on delete cascade,
  title text not null,
  description text,
  content text,
  url text,
  category text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resource_version_resource_idx on public.resource_version (resource_id, created_at desc);

select public.mg_apply_conventions(array['resource_version']);

create or replace function public.mg_resource_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.title, old.description, old.content, old.url, old.category, old.tags)
     is distinct from
     (new.title, new.description, new.content, new.url, new.category, new.tags) then
    insert into public.resource_version (owner_id, resource_id, title, description, content, url, category, tags)
    values (old.owner_id, old.id, old.title, old.description, old.content, old.url, old.category, old.tags);

    delete from public.resource_version
    where resource_id = old.id
      and id not in (
        select id from public.resource_version
        where resource_id = old.id
        order by created_at desc
        limit 30
      );
  end if;
  return new;
end;
$$;

create trigger resource_snapshot
  before update on public.resource
  for each row execute function public.mg_resource_snapshot();
