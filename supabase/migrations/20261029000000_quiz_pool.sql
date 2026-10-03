-- US-157 — QCM généré depuis les questions de ressources : réserve de questions d'un QCM.
-- Une ligne par (QCM, question). Quand un QCM a une réserve, le tirage ne pioche QUE dans ces questions
-- (les règles de tirage continuent de s'appliquer dedans). Sans réserve : toute la banque, comme avant.
-- Sans la table : la génération est masquée, rien d'autre ne change. Privée : RLS `owner_id = auth.uid()`.
-- Aucun accès anonyme (la passation ne lit que les tirages figés dans `quiz_attempt`).

create table public.quiz_pool (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quiz (id) on delete cascade,
  question_id uuid not null references public.question (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, question_id)
);

create index quiz_pool_quiz_idx on public.quiz_pool (quiz_id);

select public.mg_apply_conventions(array['quiz_pool']);
revoke all on public.quiz_pool from anon;
