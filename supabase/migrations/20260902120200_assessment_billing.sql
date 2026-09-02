-- MG COURS — grilles, évaluations, notes, commentaires, trame, factures.

-- ── grading_grid ───────────────────────────────────────────────────────────

create table public.grading_grid (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grid_criterion (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grading_grid_id uuid not null references public.grading_grid (id) on delete cascade,
  label text not null,
  description text,
  weight numeric(6, 2) not null default 1, -- points ; note_max = somme des weight
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grid_criterion_grid_idx on public.grid_criterion (grading_grid_id, position);

-- ── predefined_comment ─────────────────────────────────────────────────────

create table public.predefined_comment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  category public.comment_category not null default 'advice',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index predefined_comment_tags_idx on public.predefined_comment using gin (tags);

-- ── assessment ─────────────────────────────────────────────────────────────

create table public.assessment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  student_group_id uuid references public.student_group (id) on delete set null,
  grading_grid_id uuid references public.grading_grid (id) on delete set null,
  title text not null,
  type text, -- oral, écrit, projet, contrôle continu…
  subject text,
  coefficient numeric(5, 2) not null default 1,
  is_group_grade boolean not null default false, -- true → note de groupe (coef YNOV ×1)
  date date,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessment_module_idx on public.assessment (module_id);

-- ── grade ──────────────────────────────────────────────────────────────────
-- Une note par étudiant OU par groupe. `scores` = détail par critère.

create table public.grade (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  student_id uuid references public.student (id) on delete cascade,
  student_group_id uuid references public.student_group (id) on delete cascade,
  is_group_grade boolean not null default false,
  value numeric(5, 2),
  scores jsonb not null default '{}', -- { criterion_id: points }
  feedback text,
  predefined_comment_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_target_ck check (
    (student_id is not null and student_group_id is null)
    or (student_id is null and student_group_id is not null)
  )
);

create unique index grade_student_uidx
  on public.grade (assessment_id, student_id)
  where student_id is not null;
create unique index grade_group_uidx
  on public.grade (assessment_id, student_group_id)
  where student_group_id is not null;

-- ── pedagogical_outline (trame pédagogique) ────────────────────────────────

create table public.pedagogical_outline (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  status public.outline_status not null default 'draft',
  content jsonb not null default '{}', -- instantané éditable des séances
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  validated_at timestamptz,
  pdf_path text, -- Storage
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id)
);

-- ── invoice ────────────────────────────────────────────────────────────────

create table public.invoice (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  number text not null, -- AAAA-NNN, séquentiel par owner + année
  status public.invoice_status not null default 'draft',
  issued_on date not null default current_date,
  due_on date, -- échéance = issued_on + 30 j fin de mois
  purchase_order_ref text,
  hours numeric(6, 1) not null default 0,
  unit_price_ex_vat numeric(8, 2) not null default 0,
  amount_ex_vat numeric(10, 2) not null default 0,
  vat_rate numeric(4, 2) not null default 20, -- % ; 0 si exonéré (293 B)
  vat_amount numeric(10, 2) not null default 0,
  amount_inc_vat numeric(10, 2) not null default 0,
  recipient_email text,
  sent_at timestamptz,
  paid_on date,
  pdf_path text,
  xml_path text, -- Factur-X : XML CII
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, number)
);

create index invoice_module_idx on public.invoice (module_id);

select public.mg_apply_conventions(array[
  'grading_grid', 'grid_criterion', 'predefined_comment',
  'assessment', 'grade', 'pedagogical_outline', 'invoice'
]);
