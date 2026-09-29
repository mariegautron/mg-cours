-- US-85 — Commentaire structuré : un commentaire par critère (`criterion_comments` : {criterion_id: texte}),
-- des « Points forts » et des « Progrès ». `feedback` devient le commentaire libre. Ces champs suivent la
-- ligne `grade` : pour une note de groupe, la même fiche vaut pour tous les membres du groupe.

alter table public.grade
  add column criterion_comments jsonb not null default '{}',
  add column strengths text,
  add column progress text;
