-- Migration Notion / Moodle (E8) : correspondance source → ligne créée, pour rejouer un import
-- sans doublon, et archivage des modules déjà réalisés (années précédentes).

create table public.import_ref (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('notion', 'moodle')),
  source_id text not null, -- id de page Notion, ou « <course>:<activity> » Moodle
  target_table text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source, source_id, target_table)
);

create index import_ref_target_idx on public.import_ref (target_table, target_id);

select public.mg_apply_conventions(array['import_ref']);

alter table public.module add column archived_at timestamptz;
