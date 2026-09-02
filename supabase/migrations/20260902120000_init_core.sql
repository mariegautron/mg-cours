-- MG COURS — schéma initial : extensions, types, helpers, profil & écoles.
-- Toutes les tables : owner_id + RLS (owner_id = auth.uid()). UI en français,
-- schéma en anglais.

create extension if not exists moddatetime schema extensions;

-- ── Types ────────────────────────────────────────────────────────────────────

create type public.iceberg_state as enum (
  'fiche_received',
  'module_created',
  'outline_generated',
  'plan_on_moodle',
  'materials_on_moodle',
  'outline_sent',
  'subjects_on_moodle',
  'grades_in_hp',
  'grades_in_mg',
  'admin_docs_ok',
  'invoice_ready',
  'invoice_sent',
  'paid'
);

create type public.outline_status as enum ('draft', 'sent', 'validated');

create type public.course_type as enum (
  'lecture',    -- cours théorique
  'workshop',   -- atelier / TP
  'project',    -- projet
  'assessment', -- évaluation
  'demo',       -- démonstration
  'applied'     -- cours appliqué
);

create type public.group_type as enum ('tp', 'td', 'project');

create type public.comment_category as enum ('positive', 'negative', 'advice');

create type public.invoice_status as enum ('draft', 'ready', 'sent', 'paid');

create type public.course_resource_role as enum ('primary', 'secondary');

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Applique une politique RLS « propriétaire » (select/insert/update/delete) et
-- un trigger updated_at à une liste de tables du schéma public.
create or replace function public.mg_apply_conventions(table_names text[])
returns void
language plpgsql
as $$
declare
  t text;
begin
  foreach t in array table_names loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy mg_owner_all on public.%I for all to authenticated '
      || 'using (owner_id = (select auth.uid())) '
      || 'with check (owner_id = (select auth.uid()))',
      t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I '
      || 'for each row execute function extensions.moddatetime(updated_at)',
      t
    );
  end loop;
end;
$$;

-- ── teacher_profile ─────────────────────────────────────────────────────────

create table public.teacher_profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  legal_name text not null,
  address text,
  siret text,
  vat_number text,
  vat_exempt boolean not null default false, -- art. 293 B du CGI
  hourly_rate numeric(8, 2),
  bank_details text, -- RIB / IBAN + BIC
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

-- ── school ──────────────────────────────────────────────────────────────────

create table public.school (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  siret text,
  address text,
  billing_email text,
  pa_identifier text, -- identifiant Plateforme Agréée (facturation électronique)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['teacher_profile', 'school']);
