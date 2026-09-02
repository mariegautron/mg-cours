-- MG COURS — ressources réutilisables, modules, cours, étudiants, groupes.

-- ── resource ────────────────────────────────────────────────────────────────
-- Support pédagogique générique, réutilisable dans N modules.

create table public.resource (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  content text, -- Markdown
  url text,
  category text,
  tags text[] not null default '{}',
  files jsonb not null default '[]', -- [{ path, name, size, mime }]
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resource_owner_idx on public.resource (owner_id);
create index resource_tags_idx on public.resource using gin (tags);

-- ── module ──────────────────────────────────────────────────────────────────
-- Conteneur spécifique école / année. Porte le YCODE, les heures, la trame,
-- la facturation.

create table public.module (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  school_id uuid references public.school (id) on delete set null,
  name text not null,
  level text, -- ex. « Master 1 Informatique »
  year integer not null,
  ycode text,
  total_hours numeric(5, 1) not null default 0,
  hours_lecture numeric(5, 1),
  hours_td numeric(5, 1),
  hours_tp numeric(5, 1),
  start_date date,
  first_session_date date, -- sert au calcul trame_due_date = first_session_date - 15j
  end_date date,
  iceberg_state public.iceberg_state not null default 'fiche_received',
  purchase_order_ref text, -- référence bon de commande / convention YNOV
  admin_docs jsonb not null default jsonb_build_object(
    'fiche_positionnement', false,
    'progression_pedagogique', false,
    'supports_moodle', false,
    'sujets_grilles_moodle', false
  ),
  hourly_rate numeric(8, 2), -- surcharge éventuelle du tarif du profil
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index module_owner_idx on public.module (owner_id);
create index module_school_idx on public.module (school_id);
create unique index module_ycode_year_uidx
  on public.module (owner_id, ycode, year)
  where ycode is not null;

-- ── course ──────────────────────────────────────────────────────────────────
-- Unité d'un module (≈ « Séance »). Liée à une ou plusieurs ressources.

create table public.course (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  session_date date,
  type public.course_type not null default 'lecture',
  learning_objectives text[] not null default '{}',
  animation_notes text, -- modalités d'animation (trame)
  assessment_notes text, -- modalités d'évaluation (trame)
  material text, -- matériel nécessaire (trame)
  prep_status text not null default 'todo', -- todo | in_progress | ready
  slides jsonb not null default '[]',
  content_last_updated_at timestamptz not null default now(), -- critique pour la trame
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index course_module_idx on public.course (module_id, position);

-- ── course_resource ────────────────────────────────────────────────────────

create table public.course_resource (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null references public.course (id) on delete cascade,
  resource_id uuid not null references public.resource (id) on delete cascade,
  role public.course_resource_role not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, resource_id)
);

create index course_resource_course_idx on public.course_resource (course_id);
create index course_resource_resource_idx on public.course_resource (resource_id);

-- ── student ─────────────────────────────────────────────────────────────────

create table public.student (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  photo_url text,
  student_number text,
  scholar_group text, -- groupe de scolarité d'origine (import Hyperplanning)
  personal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_owner_idx on public.student (owner_id);
create unique index student_email_uidx
  on public.student (owner_id, lower(email))
  where email is not null;

-- ── student_group ──────────────────────────────────────────────────────────

create table public.student_group (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  name text not null,
  type public.group_type not null default 'project',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, name)
);

create index student_group_module_idx on public.student_group (module_id);

-- ── group_member ───────────────────────────────────────────────────────────

create table public.group_member (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_group_id uuid not null references public.student_group (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_group_id, student_id)
);

create index group_member_group_idx on public.group_member (student_group_id);
create index group_member_student_idx on public.group_member (student_id);

select public.mg_apply_conventions(array[
  'resource', 'module', 'course', 'course_resource',
  'student', 'student_group', 'group_member'
]);
