-- US-87 — Absences. Statut par étudiant·e et par évaluation :
--  · présent·e ;
--  · absent·e non prévenu·e : note 0 automatique (règle de l'école) ;
--  · absent·e excusé·e : pas de note, hors moyenne tant qu'un rattrapage ne la remplace pas (US-96).
-- `grade.attendance` porte le statut d'une note individuelle. Dans une note de groupe, la note du groupe
-- n'est jamais modifiée : les ajustements d'un·e membre (absence, pondération individuelle justifiée à
-- l'oral) vivent dans `group_grade_member`, une ligne par membre concerné.

create type public.attendance_status as enum ('present', 'absent_unexcused', 'absent_excused');

alter table public.grade
  add column attendance public.attendance_status not null default 'present';

create table public.group_grade_member (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grade_id uuid not null references public.grade (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  attendance public.attendance_status not null default 'present',
  -- Multiplicateur de la note du groupe (0,8 = 80 %), plafonné au barème à l'affichage.
  individual_factor numeric(4, 2) not null default 1
    check (individual_factor >= 0 and individual_factor <= 2),
  justification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_id, student_id),
  constraint group_grade_member_justification_ck
    check (individual_factor = 1 or coalesce(btrim(justification), '') <> '')
);

create index group_grade_member_student_idx on public.group_grade_member (student_id);

select public.mg_apply_conventions(array['group_grade_member']);
