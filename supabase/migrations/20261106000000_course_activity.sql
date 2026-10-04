-- Déroulé structuré : chaque activité (ressource du déroulé d'une séance) peut porter une durée
-- estimée, un type, un horaire de début, un objectif pédagogique et un état de préparation.
-- Additif : cinq colonnes nullables sur `course_resource`, rien n'est modifié ni supprimé. Sans la
-- migration, l'écran Séances garde son déroulé simple et le dit.

alter table public.course_resource
  add column if not exists duration_minutes integer
    check (duration_minutes is null or (duration_minutes between 1 and 600)),
  add column if not exists activity_type text,
  add column if not exists start_time time,
  add column if not exists pedagogical_objective text,
  add column if not exists prep_state text
    check (prep_state is null or prep_state in ('not_started', 'in_progress', 'ready'));
