-- US-98 — Retour d'expérience d'une évaluation : note privée de Marie (ce qui a marché, ce qui a
-- coincé, à changer l'an prochain). Elle n'est JAMAIS copiée quand on duplique le module : elle est
-- relue avant la duplication (comme celle des séances, US-68) puis la nouvelle évaluation repart vide.
-- Jamais projetée, exportée ni envoyée.

alter table public.assessment add column experience_note text;
