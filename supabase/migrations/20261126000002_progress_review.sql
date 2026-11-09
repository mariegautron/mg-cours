-- Point d'étape : un rendu commenté SANS note. Les étudiant·es déposent où en est leur projet ;
-- Marie donne, par critère, un repère (« En avance », « Sur la bonne voie », « À revoir ») et un
-- commentaire. Rien n'entre dans une moyenne, dans les notes exigées ni dans l'export Hyperplanning :
-- un point d'étape n'a jamais de ligne `grade`.
--
-- Une évaluation est un point d'étape quand son type est « Point d'étape (sans note) » (type déjà
-- existant). Elle est rattachée à l'évaluation notée qui la prend en compte (`review_for_id`) et
-- reprend tout ou partie de sa grille (`review_criterion_ids`, `null` = toute la grille).
--
-- Ajout seulement : aucune note, moyenne ou résultat existant n'est lu ni modifié.
-- Retour arrière :
--   drop table public.progress_review;
--   alter table public.assessment drop column review_for_id, drop column review_criterion_ids;

alter table public.assessment
  add column if not exists review_for_id uuid references public.assessment (id) on delete set null,
  add column if not exists review_criterion_ids uuid[];

create table if not exists public.progress_review (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  -- Le groupe (point d'étape de groupe) ou la personne (individuel).
  subject_id uuid not null,
  -- { critère: 'ahead' | 'on_track' | 'review' }.
  marks jsonb not null default '{}' check (jsonb_typeof(marks) = 'object'),
  -- { critère: texte } : commentaire par critère, vu par les étudiant·es une fois publié.
  comments jsonb not null default '{}' check (jsonb_typeof(comments) = 'object'),
  global_comment text not null default '',
  -- { étudiant·e: texte } : mot perso facultatif, vu par la personne seule.
  person_comments jsonb not null default '{}' check (jsonb_typeof(person_comments) = 'object'),
  -- Notes privées de Marie, jamais montrées ni recopiées.
  private_note text not null default '',
  -- { champ: n } : version de chaque champ, pour ne jamais écraser une saisie plus récente.
  field_versions jsonb not null default '{}' check (jsonb_typeof(field_versions) = 'object'),
  state text not null default 'in_progress' check (state in ('in_progress', 'done')),
  done_at timestamptz,
  -- Version publiée (ce que voient les étudiant·es) : { marks, comments, global_comment, person_comments }.
  published jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, subject_id)
);

create index if not exists progress_review_assessment_idx on public.progress_review (assessment_id);
create index if not exists assessment_review_for_idx on public.assessment (review_for_id);

select public.mg_apply_conventions(array['progress_review']);
revoke all on public.progress_review from anon;
