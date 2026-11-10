-- Dépôts des étudiant·es : historique des versions (visible par Marie seulement) et notification
-- « nouveau rendu » (vue par Marie).
--
-- Un dépôt remplacé n'est plus supprimé : ses éléments gardent `replaced_at` / `replaced_by_student_id`
-- et leurs fichiers restent dans le stockage (conservés jusqu'à la clôture du module). L'espace de
-- l'étudiant·e ne lit que les éléments non remplacés. `teacher_seen_at` est vide tant que Marie n'a pas
-- ouvert l'évaluation depuis le dépôt.
-- Rejouable : déjà passée à la main en prod, et numéro de version partagé avec
-- appreciation_phrase (renommée en …0001 le 10 nov. 2026).
alter table public.submission_item
  add column if not exists replaced_at timestamptz,
  add column if not exists replaced_by_student_id uuid references public.student (id) on delete set null,
  add column if not exists teacher_seen_at timestamptz;

create index if not exists submission_item_unseen_idx
  on public.submission_item (assessment_id)
  where added_by = 'student' and teacher_seen_at is null and replaced_at is null;
