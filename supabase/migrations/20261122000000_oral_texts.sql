-- Oral, lot 2 : textes à valider (un par critère, points forts, axes de progrès, commentaire global),
-- commentaires personnels proposés, et suivi des notes déjà réparties.
--
-- Ajout seulement : aucune note, moyenne ou résultat existant n'est lu ni modifié.
--
-- Retour arrière :
--   alter table public.oral_space drop column texts, drop column person_comments, drop column routed;

alter table public.oral_space
  -- { champ: { text, state, hash, letter, proposed_from } } : champs « crit:<id> », strengths, progress, global.
  add column texts jsonb not null default '{}' check (jsonb_typeof(texts) = 'object'),
  -- { étudiant·e: { text, state, hash, proposed_from } } : commentaire perso, tutoiement, vu par la personne seule.
  add column person_comments jsonb not null default '{}' check (jsonb_typeof(person_comments) = 'object'),
  -- { clé de note: { dest, at } } : notes du bloc-notes déjà réparties (l'original reste en place).
  add column routed jsonb not null default '{}' check (jsonb_typeof(routed) = 'object');
