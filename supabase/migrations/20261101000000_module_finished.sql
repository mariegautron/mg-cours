-- Refonte « Modules » — « Terminer » et « Ranger » sont deux gestes distincts (maquette ModulesListe) :
-- terminer = le module sort de « En cours » et passe dans « Terminés » (la facture reste à faire),
-- ranger = il est masqué (`archived_at`, déjà existant). Colonne additive : `finished_at`.
-- Sans elle : « Terminer » retombe sur le rangement (comportement d'avant), « Terminés » reste vide.

alter table public.module add column finished_at timestamptz;
