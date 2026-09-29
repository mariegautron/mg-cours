-- US-84 — Commentaires réutilisables : une phrase enregistrée depuis un commentaire est rattachée à un
-- critère (`grid_criterion_id`, avec `criterion_label` recopié pour survivre à la suppression ou à la
-- duplication de la grille) et à une matière (`subject`). Insérer une phrase COPIE son texte : modifier
-- ou supprimer la phrase ne change jamais un commentaire déjà écrit. `use_count` / `last_used_at`
-- servent à proposer les phrases les plus utilisées en premier.

alter table public.predefined_comment
  add column grid_criterion_id uuid references public.grid_criterion (id) on delete set null,
  add column criterion_label text,
  add column subject text,
  add column use_count integer not null default 0,
  add column last_used_at timestamptz;

create index predefined_comment_criterion_idx on public.predefined_comment (grid_criterion_id);

-- Incrément atomique (security invoker : la RLS `owner_id = auth.uid()` s'applique).
create function public.bump_comment_use(comment_id uuid) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.predefined_comment
  set use_count = use_count + 1, last_used_at = now()
  where id = comment_id;
$$;
