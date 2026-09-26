-- Facture émise hors de l'application (ex. logiciel de facturation externe) : le PDF est conservé
-- sur le module et le module peut être marqué « payé » sans passer par la génération Factur-X.
alter type public.module_document_kind add value if not exists 'external_invoice';
