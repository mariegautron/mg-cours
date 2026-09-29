-- US-92 — Oral de fin de projet : ordre de passage (volontaires d'abord, puis tirage reproductible) et
-- créneaux. Une ligne par groupe passant : `position` = rang de passage, `duration_minutes` = durée
-- propre au créneau (vide : durée de l'évaluation), `status` = passé ou non. Les horaires se déduisent
-- de `assessment.oral_start_time` et des durées, ils ne sont pas stockés.

create type public.oral_slot_status as enum ('waiting', 'done');
create type public.oral_order_method as enum ('volunteer', 'draw');

alter table public.assessment add column oral_start_time time;

create table public.oral_slot (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  position integer not null,
  duration_minutes integer check (duration_minutes is null or (duration_minutes > 0 and duration_minutes <= 240)),
  status public.oral_slot_status not null default 'waiting',
  order_method public.oral_order_method not null,
  order_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_group_id)
);

create index oral_slot_assessment_idx on public.oral_slot (assessment_id, position);

select public.mg_apply_conventions(array['oral_slot']);
