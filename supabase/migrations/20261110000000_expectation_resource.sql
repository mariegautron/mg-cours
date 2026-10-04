-- Rapprochement : lien EXPLICITE attendu ↔ ressource. « Associer à cet attendu » crée un lien pour
-- cet attendu seulement ; un attendu n'est couvert que s'il a au moins un lien (la correspondance par
-- mots ne fait que proposer). Table additive : sans elle, l'appli garde l'ancien calcul par mots et
-- le dit. Aucun lien n'est créé automatiquement pour les modules existants (bouton « Reprendre le
-- rapprochement automatique » dans l'écran, avec aperçu).

create table if not exists public.expectation_resource (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  expectation_id uuid not null references public.module_expectation (id) on delete cascade,
  resource_id uuid not null references public.resource (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (expectation_id, resource_id)
);

create index if not exists expectation_resource_module_idx
  on public.expectation_resource (module_id);
create index if not exists expectation_resource_resource_idx
  on public.expectation_resource (resource_id);

alter table public.expectation_resource enable row level security;

create policy "expectation_resource_owner" on public.expectation_resource
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
