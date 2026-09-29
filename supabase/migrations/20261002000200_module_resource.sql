-- US-55 : ressources retenues pour un module (avant même de les lier à une séance).
create table public.module_resource (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  resource_id uuid not null references public.resource (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, resource_id)
);

create index module_resource_module_idx on public.module_resource (module_id);
create index module_resource_resource_idx on public.module_resource (resource_id);

select public.mg_apply_conventions(array['module_resource']);
