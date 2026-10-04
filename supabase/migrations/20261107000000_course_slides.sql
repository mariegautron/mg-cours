-- Slides par séance : un lien (Figma, Google Slides, PDF en ligne…) par séance, affiché dans l'écran
-- Séances, « Avant de commencer », la vue privée de la projection et la page étudiante.
-- Additif : une colonne nullable sur `course`. Sans elle, le champ répond « disponible après la
-- mise à jour » et rien d'autre ne change.
alter table public.course add column if not exists slides_url text;
