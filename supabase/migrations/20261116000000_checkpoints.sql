-- Jalons : suivi NON NOTÉ des points de contrôle (P1 à P6) d'un module, avec les dépôts des
-- étudiant·es et le retour écrit de l'enseignante. Rien de cela n'entre dans une moyenne ou une note.
-- Les fichiers reçus sont dans le bucket privé `resource-files`, sous `<owner_id>/checkpoints/…`
-- (la policy du bucket porte sur le premier dossier : l'identifiant du propriétaire).

create table public.checkpoint (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  position int not null,
  code text not null,
  title text not null,
  due_date date,
  response_date date,
  expected_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, code)
);

create index checkpoint_module_idx on public.checkpoint (module_id, position);

create table public.checkpoint_result (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkpoint_id uuid not null references public.checkpoint (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'validated', 'refused')),
  feedback_md text not null default '',
  private_note text not null default '',
  files jsonb not null default '[]' check (jsonb_typeof(files) = 'array'),
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkpoint_id, student_id)
);

create index checkpoint_result_student_idx on public.checkpoint_result (student_id);

select public.mg_apply_conventions(array['checkpoint', 'checkpoint_result']);
revoke all on public.checkpoint, public.checkpoint_result from anon;
