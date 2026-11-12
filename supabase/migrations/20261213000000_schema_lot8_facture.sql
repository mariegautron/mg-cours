-- Schéma BDD, lot 8 : facture.
--
-- Constat (diagnostic du 12 nov. 2026) : 0 ligne dans `invoice`. Marie facture HORS de l'appli :
-- elle dépose le PDF (module_document « external_invoice ») puis coche « Envoyée » / « Payée ».
-- Une facture par module est déjà garantie (index unique `invoice_module_uidx`, 20260924120000).
--
-- CE QUE FAIT LA MIGRATION (additive, aucune ligne lue ni modifiée) :
--   - fonction `mg_invoice_guard_delete` + déclencheur `invoice_guard_delete` : la base refuse de
--     supprimer une facture qui n'est plus un brouillon (prête, envoyée ou payée : elle porte un
--     numéro, la numérotation ne doit pas avoir de trou). Vaut aussi pour la suppression en
--     cascade d'un module qui aurait une telle facture.
--   - commentaires : la source unique de « envoyée » / « payée » est `module.iceberg_state`
--     (cases de la page Facture), les dates sont dans `invoice_tracking`.
--
-- CE QUI CHANGE POUR MARIE : rien de visible aujourd'hui (aucune facture générée dans l'appli).
-- Côté code (même lot) : « envoyée » / « payée » lus au même endroit partout, y compris
-- « À faire » du tableau de bord et la Prochaine étape de la Facturation.
--
-- RETOUR ARRIÈRE :
--   drop trigger if exists invoice_guard_delete on public.invoice;
--   drop function if exists public.mg_invoice_guard_delete();
--   comment on column public.module.iceberg_state is null;
--   comment on table public.invoice_tracking is null;
--   comment on table public.invoice is null;
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot8.sql

create or replace function public.mg_invoice_guard_delete() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Une facture numérotée (%) ne peut pas être supprimée.', old.number
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'invoice_guard_delete' and tgrelid = 'public.invoice'::regclass) then
    create trigger invoice_guard_delete
      before delete on public.invoice
      for each row execute function public.mg_invoice_guard_delete();
  end if;
end;
$$;

comment on column public.module.iceberg_state is
  'Avancement du module. Source unique de « facture envoyée » (>= invoice_sent) et « payée » (= paid), '
  'cochées sur la page Facture (invoiceProgress, src/lib/invoice/simple.ts).';
comment on table public.invoice_tracking is
  'Dates « envoyée le » / « payée le » d''une facture faite hors de l''appli (une ligne par module). '
  'L''état envoyée / payée lui-même est module.iceberg_state.';
comment on table public.invoice is
  'Facture Factur-X générée dans l''appli (vide au 12/11/2026). Une par module (invoice_module_uidx). '
  'Une facture non brouillon ne peut pas être supprimée (invoice_guard_delete).';
