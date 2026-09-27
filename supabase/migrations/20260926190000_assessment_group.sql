-- Évaluation multi-groupes : une évaluation vise N groupes (ex. un même TP noté pour 6 groupes de
-- projet). Remplace assessment.student_group_id ; le compteur YNOV reste « 1 évaluation notée = 1 note ».

create table public.assessment_group (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_group_id)
);

create index assessment_group_group_idx on public.assessment_group (student_group_id);

select public.mg_apply_conventions(array['assessment_group']);

insert into public.assessment_group (owner_id, assessment_id, student_group_id)
select owner_id, id, student_group_id
from public.assessment
where student_group_id is not null;

alter table public.assessment drop column student_group_id;
