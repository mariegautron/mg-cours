-- US-94 — Banque de questions de Marie (docs/specs/qcm-banque-questions.md). La banque est à Marie,
-- pas rattachée à un module : catégories et tags suffisent pour cibler un cours. Les choix portent une
-- `fraction` (−1…1) pour les QCM à réponses multiples ; `is_correct` = fraction > 0. Vrai / faux : deux
-- choix « Vrai » et « Faux » créés avec la question. Numérique : valeur attendue + tolérance sur la question.
-- Une question modifiée après usage dans un QCM ne change pas les passations passées : le QCM fige son
-- propre instantané (US-95). Aucun accès anonyme : RLS `owner_id = auth.uid()`.

create type public.question_type as enum
  ('single_choice', 'multiple_choice', 'true_false', 'numerical', 'open');

create table public.question (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null default '',
  name text not null,
  type public.question_type not null,
  statement text not null,
  general_feedback text not null default '',
  default_points numeric(6, 2) not null default 1 check (default_points >= 0),
  tags text[] not null default '{}',
  numeric_value numeric,
  numeric_tolerance numeric check (numeric_tolerance is null or numeric_tolerance >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_numeric_ck check (type <> 'numerical' or numeric_value is not null)
);

create index question_owner_category_idx on public.question (owner_id, category);
create index question_tags_idx on public.question using gin (tags);

create table public.question_choice (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null references public.question (id) on delete cascade,
  position integer not null,
  text text not null,
  is_correct boolean not null default false,
  fraction numeric(5, 4) not null default 0 check (fraction >= -1 and fraction <= 1),
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, position)
);

select public.mg_apply_conventions(array['question', 'question_choice']);
