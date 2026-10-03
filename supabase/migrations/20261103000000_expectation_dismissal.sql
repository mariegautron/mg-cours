-- Rapprochement : « Ce n'est pas la bonne » écarte une ressource proposée pour un attendu, et on ne
-- la lui repropose plus. Table additive ; sans elle, le bouton répond par un message clair.

create table if not exists public.expectation_dismissal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  expectation_id uuid not null,
  resource_id uuid not null references public.resource (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (module_id, expectation_id, resource_id)
);

alter table public.expectation_dismissal enable row level security;

create policy "expectation_dismissal_owner" on public.expectation_dismissal
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
