-- Dépôt des rendus par les étudiant·es depuis leur espace personnel.
--
-- Réglages de l'évaluation : rendre « dans MG COURS » ou « ailleurs » (Moodle…), et ce qu'on rend
-- (fichier, lien ou les deux). Les dépôts utilisent `submission_item` (added_by = 'student') : « Rendus
-- déposés » les affiche déjà. Le serveur vérifie le jeton d'espace (haché) avant toute écriture ; aucune
-- table n'est ouverte à `anon`.
alter table public.assessment
  add column submit_mode text not null default 'elsewhere'
    check (submit_mode in ('app', 'elsewhere')),
  add column submit_accepts text not null default 'both'
    check (submit_accepts in ('file', 'link', 'both'));

-- Heure de dépôt (serveur), qui a déposé (rendu de groupe), lot de fichiers d'un même dépôt.
alter table public.submission_item
  add column submitted_at timestamptz not null default now(),
  add column submitted_by_student_id uuid references public.student (id) on delete set null,
  add column batch_id uuid;

create index submission_item_batch_idx on public.submission_item (batch_id) where batch_id is not null;
