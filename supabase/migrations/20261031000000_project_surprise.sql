-- US-128 — Imprévus du client : messages planifiés entre les séances d'un projet fil rouge.
-- Une ligne par imprévu : titre, séance de diffusion (facultative), message prêt à copier, date d'envoi
-- une fois envoyé. Privé : RLS `owner_id = auth.uid()`. Sans la table : la section est masquée avec un
-- message et le rappel « Aujourd'hui » n'apparaît pas ; rien d'autre ne change.

create table public.project_surprise (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.module_project (id) on delete cascade,
  course_id uuid references public.course (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 5000),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_surprise_project_idx on public.project_surprise (project_id);
create index project_surprise_course_idx on public.project_surprise (course_id);

select public.mg_apply_conventions(array['project_surprise']);
