-- US-160 — « Ce que je retiens de ce module » : un mot privé de Marie, écrit quand elle termine et
-- range un module. Nouvelle table (une ligne par module) plutôt qu'une colonne sur `module`, lue
-- partout : sans elle, l'appli fonctionne, sans ce champ. Privé : RLS `owner_id = auth.uid()`,
-- jamais exporté ni projeté. Purement additif.

create table public.module_retrospective (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null unique references public.module (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['module_retrospective']);
