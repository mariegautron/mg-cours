-- Dépôts des étudiant·es : historique des versions (visible par Marie seulement) et notification
-- « nouveau rendu » (vue par Marie).
--
-- Un dépôt remplacé n'est plus supprimé : ses éléments gardent `replaced_at` / `replaced_by_student_id`
-- et leurs fichiers restent dans le stockage (conservés jusqu'à la clôture du module). L'espace de
-- l'étudiant·e ne lit que les éléments non remplacés. `teacher_seen_at` est vide tant que Marie n'a pas
-- ouvert l'évaluation depuis le dépôt.
alter table public.submission_item
  add column replaced_at timestamptz,
  add column replaced_by_student_id uuid references public.student (id) on delete set null,
  add column teacher_seen_at timestamptz;

create index submission_item_unseen_idx
  on public.submission_item (assessment_id)
  where added_by = 'student' and teacher_seen_at is null and replaced_at is null;
