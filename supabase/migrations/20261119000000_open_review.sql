-- Questions ouvertes tirées au sort (« Étude de cas ») : relecture copie par copie.
--
-- Ajout seulement : aucune note, moyenne, appréciation ou résultat existant n'est lu ni modifié.
-- Une évaluation existante reste en correction classique tant que Marie ne choisit pas, sur sa
-- fiche, la correction « questions ouvertes » (`quiz.correction_mode`).
--
-- Retour arrière (sans perte pour le reste de l'application) :
--   drop table public.open_review;
--   drop table public.quiz_question_criterion;
--   alter table public.quiz drop column correction_mode;

alter table public.quiz
  add column correction_mode text not null default 'classic'
    check (correction_mode in ('classic', 'open_questions'));

-- Critère(s) de la grille auxquels une question se rattache, pour ce QCM.
create table public.quiz_question_criterion (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quiz (id) on delete cascade,
  question_id uuid not null,
  criterion_id uuid not null references public.grid_criterion (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (quiz_id, question_id, criterion_id)
);
create index quiz_question_criterion_quiz_idx on public.quiz_question_criterion (quiz_id);

-- Relecture d'une copie : la décision de Marie, séparée de toute proposition (`proposals`, réservé).
create table public.open_review (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.quiz_attempt (id) on delete cascade,
  -- { "1": { letter, points, comment, validated_at, validated: { letter, points, comment } } }
  questions jsonb not null default '{}' check (jsonb_typeof(questions) = 'object'),
  global_comment text not null default '',
  -- { critère: "A".."D" } : la lettre confirmée par Marie pour chaque critère.
  criterion_letters jsonb not null default '{}' check (jsonb_typeof(criterion_letters) = 'object'),
  field_versions jsonb not null default '{}' check (jsonb_typeof(field_versions) = 'object'),
  -- Réservé aux propositions (étape suivante) : jamais lu pour décider.
  proposals jsonb,
  -- Verrou : une copie écrite est en lecture seule jusqu'à « Rouvrir la copie ».
  locked boolean not null default false,
  -- Photo de ce qui a été écrit dans l'évaluation.
  written jsonb,
  written_at timestamptz,
  -- Anciennes valeurs, gardées à chaque réouverture : [ { at, value, letters } ].
  history jsonb not null default '[]' check (jsonb_typeof(history) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id)
);

select public.mg_apply_conventions(array['quiz_question_criterion', 'open_review']);
revoke all on public.quiz_question_criterion, public.open_review from anon;
