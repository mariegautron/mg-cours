-- US-60: Horaires et duree par seance
-- Ajout des colonnes start_time et end_time (nullable) pour calculer la duree
-- Fonction pure: duree par seance en heures
-- Affichage: "18 h planifiees / 21 h" avec avertissement si incoherence

alter table public.course
  add column start_time time,
  add column end_time time;

select public.mg_apply_conventions(array['course']);
