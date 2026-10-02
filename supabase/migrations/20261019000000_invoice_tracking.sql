-- US-150 — Facturation simple : Marie fait sa facture elle-même, dépose le PDF et coche
-- « Envoyée » / « Payée ». Les cases s'appuient sur l'état du module (`iceberg_state`) ; cette table
-- ne garde que les DATES (envoyée le, payée le), une ligne par module. Nouvelle table plutôt qu'une
-- colonne sur `module` ou `invoice`, lues partout : sans elle, l'appli fonctionne, sans les dates.
-- Données de Marie : RLS `owner_id = auth.uid()`, aucun accès anonyme. Purement additif.

create table public.invoice_tracking (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null unique references public.module (id) on delete cascade,
  sent_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['invoice_tracking']);
