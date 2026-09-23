-- Facture : instantané figé (vendeur, acheteur, ligne, montants…) pour régénérer à l'identique
-- le PDF Factur-X et son XML ; une seule facture par module.

alter table public.invoice add column snapshot jsonb;

create unique index invoice_module_uidx on public.invoice (module_id);
