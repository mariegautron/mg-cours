-- Convention de formation (ou de prestation, avenant…) d'un module : plusieurs fichiers par module,
-- chacun avec un libellé libre et une date de signature facultative. Un même fichier de stockage
-- peut être rattaché à plusieurs modules (une ligne par module, même `path`).
-- Additif : une valeur d'énumération et deux colonnes nullables, rien n'est modifié ni supprimé.
alter type public.module_document_kind add value if not exists 'training_agreement';

alter table public.module_document add column if not exists label text;
alter table public.module_document add column if not exists signed_on date;
