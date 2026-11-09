-- Règles de notation par école (rattrapages, lot 6) : ce qui était fixé dans le code pour YNOV
-- (paliers d'heures → notes exigées, coefficients groupe / individuel, bonus de certification)
-- devient un réglage de l'école, dans `school_setting`. Valeurs par défaut = YNOV : une école
-- sans ligne, ou une ligne existante, garde exactement les mêmes moyennes. Purement additif.
-- Toutes les notes restent ramenées sur 20 (barème Hyperplanning), ce n'est pas un réglage.

alter table public.school_setting
  add column if not exists group_coefficient numeric(4, 2) not null default 1
    check (group_coefficient > 0 and group_coefficient <= 20),
  add column if not exists individual_coefficient numeric(4, 2) not null default 3
    check (individual_coefficient > 0 and individual_coefficient <= 20),
  add column if not exists note_brackets jsonb not null default
    '[{"min_hours":4,"max_hours":16,"group":1,"individual":1},{"min_hours":20,"max_hours":48,"group":2,"individual":1},{"min_hours":52,"max_hours":70,"group":3,"individual":2}]'::jsonb
    check (jsonb_typeof(note_brackets) = 'array'),
  add column if not exists bonus_allowed boolean not null default true;
