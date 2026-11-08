-- Formulations personnelles de Marie pour le gabarit d'appréciation (par partie). Elles passent
-- avant celles de l'appli. Aucune donnée existante n'est modifiée.

create table public.appreciation_phrase (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  part text not null check (part in ('strength', 'axis', 'encouragement')),
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appreciation_phrase_part_idx on public.appreciation_phrase (part, created_at);

select public.mg_apply_conventions(array['appreciation_phrase']);
