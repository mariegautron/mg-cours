-- Espace de correction d'un oral : brouillon de la correction en direct (lettres, notes par critère,
-- bloc-notes du groupe, notes par personne) et « photo » de la note écrite.
--
-- Ajout seulement : aucune note, moyenne, appréciation ou résultat existant n'est lu ni modifié.
-- Tant que « Écrire la note » n'est pas cliqué, ce brouillon ne touche pas à `grade`.
-- Le bloc-notes et les notes par personne ne sont lus ni par les résultats, ni par l'espace
-- étudiant·e, ni par les PDF, ni par la fenêtre projetée.
--
-- Retour arrière (sans perte pour le reste de l'application) :
--   drop table public.oral_space;

create table public.oral_space (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.assessment (id) on delete cascade,
  -- Le groupe (oral de groupe) ou la personne (oral individuel).
  subject_id uuid not null,
  -- { critère: "A".."D" } : A est le palier le plus haut.
  letters jsonb not null default '{}' check (jsonb_typeof(letters) = 'object'),
  -- { critère: texte } : notes prises sur le critère pendant l'oral.
  criterion_notes jsonb not null default '{}' check (jsonb_typeof(criterion_notes) = 'object'),
  -- Bloc-notes du groupe, « pour toi seule, jamais envoyé ».
  pad text not null default '',
  -- { étudiant·e: texte } : notes par personne (destinées plus tard au commentaire personnel).
  person_notes jsonb not null default '{}' check (jsonb_typeof(person_notes) = 'object'),
  -- { étudiant·e: 'present' | 'absent_excused' | 'absent_unexcused' }.
  attendance jsonb not null default '{}' check (jsonb_typeof(attendance) = 'object'),
  -- { champ: n } : version de chaque champ, pour ne jamais écraser une saisie plus récente.
  field_versions jsonb not null default '{}' check (jsonb_typeof(field_versions) = 'object'),
  -- Brouillon d'un oral déjà noté avant ce lot : l'ancienne note reste en place jusqu'à l'écriture.
  from_existing boolean not null default false,
  -- Règle d'absence choisie pour l'écriture : 'group_all' (tout le groupe a la note du groupe) ou
  -- 'legacy' (règle d'origine de l'oral).
  absence_rule text not null default 'group_all' check (absence_rule in ('group_all', 'legacy')),
  -- Photo de la note écrite : { letters, attendance, absence_rule, value, per_student }.
  written jsonb,
  written_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, subject_id)
);

create index oral_space_assessment_idx on public.oral_space (assessment_id);

select public.mg_apply_conventions(array['oral_space']);
revoke all on public.oral_space from anon;
