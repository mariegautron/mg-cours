-- US-54 : attendus de l'école couverts par une séance (rapprochement attendus ↔ séances).
create table public.course_expectation (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null references public.course (id) on delete cascade,
  expectation_id uuid not null references public.module_expectation (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, expectation_id)
);

create index course_expectation_course_idx on public.course_expectation (course_id);
create index course_expectation_expectation_idx on public.course_expectation (expectation_id);

select public.mg_apply_conventions(array['course_expectation']);
