-- US-60: Horaires et duree par seance
-- Ajout des colonnes start_time et end_time (nullable) pour calculer la duree
-- Fonction pure: duree par seance en heures
-- Affichage: "18 h planifiees / 21 h" avec avertissement si incoherence
-- Table existante : RLS et trigger updated_at deja en place (pas de mg_apply_conventions).

alter table public.course
  add column if not exists start_time time,
  add column if not exists end_time time;
