-- US-162 — Règles par école : absence excusée (garde la note du groupe / rattrapage), modèle
-- d'adresse e-mail des étudiant·es, longueur maximale de l'appréciation. Une ligne par école,
-- dans une NOUVELLE table (la table `school` est lue partout) : sans elle, l'appli utilise les
-- valeurs par défaut du code. Le « non prévenu·e = 0 » est fixe et n'est pas un réglage.
-- Données de Marie : RLS `owner_id = auth.uid()`, aucun accès anonyme. Purement additif.

create table public.school_setting (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  school_id uuid not null unique references public.school (id) on delete cascade,
  absence_rule text not null default 'keep_group_grade'
    check (absence_rule in ('keep_group_grade', 'makeup')),
  email_template text not null default '',
  appreciation_max integer not null default 250 check (appreciation_max between 50 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['school_setting']);
