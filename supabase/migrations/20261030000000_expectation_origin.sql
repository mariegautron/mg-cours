-- US-125 — Attendus ajoutés à la main par l'intervenante.
-- Colonne additive sur `module_expectation` (et non une table à part) : les liens `course_expectation`
-- (clé étrangère vers cette table), le rapprochement, la couverture et la progression fonctionnent ainsi
-- tout de suite pour ces attendus. `origin` : 'school' (fiche de l'école, défaut) ou 'custom' (ajouté
-- par l'intervenante). Sans cette migration : l'ajout à la main est indisponible, tout le reste est inchangé.

alter table public.module_expectation
  add column origin text not null default 'school' check (origin in ('school', 'custom'));
