-- Schéma BDD, lot 6 : doublons de sens. Le gros du lot est dans le code ; la base ne change que
-- par un défaut de colonne et des commentaires. Aucune ligne modifiée, aucune note touchée.
--
-- CE QUE FAIT LA MIGRATION :
--   - `module.admin_docs` : la clé `progression_pedagogique` sort du DÉFAUT (nouveaux modules).
--     Les lignes existantes gardent leur clé : elle reste une des sources de « progression
--     envoyée » (isOutlineSent, src/lib/modules/outline-sent.ts), avec pedagogical_outline et le
--     document « outline_sent » ;
--   - commentaires sur les colonnes que l'application ne lit ni n'écrit plus (gardées en base,
--     suppression éventuelle au lot 9) : grade.is_group_grade, assessment.submission_mode,
--     student.scholar_group, student.photo_url, module.hours_lecture / hours_td / hours_tp.
--
-- CE QUI CHANGE POUR MARIE (code de ce lot) :
--   - « Progression envoyée » est la même partout (fiche du module, Où j'en suis, Prochaine étape,
--     facture, tableau de bord) : une seule des trois traces suffit ;
--   - une évaluation rattachée à une séance datée prend la date de la séance, et la suit si la
--     séance change de date (les évaluations déjà enregistrées ne bougent pas d'elles-mêmes) ;
--   - groupe ↔ individuel n'est plus modifiable une fois des notes saisies (« Cette évaluation a
--     déjà des notes ») ;
--   - « Comment les rendus arrivent » disparaît de « Quelle épreuve ? » : seul le réglage « Les
--     étudiant·es rendent » compte (c'était déjà lui qui décidait) ;
--   - les heures CM / TD / TP disparaissent des formulaires du module (valeurs gardées en base) ;
--   - la recherche affiche la promotion de l'année (student_year).
--
-- RETOUR ARRIÈRE :
--   alter table public.module alter column admin_docs set default jsonb_build_object(
--     'fiche_positionnement', false, 'progression_pedagogique', false,
--     'supports_moodle', false, 'sujets_grilles_moodle', false);
--   comment on column public.grade.is_group_grade is null;
--   comment on column public.assessment.submission_mode is null;
--   comment on column public.student.scholar_group is null;
--   comment on column public.student.photo_url is null;
--   comment on column public.module.hours_lecture is null;
--   comment on column public.module.hours_td is null;
--   comment on column public.module.hours_tp is null;
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot6.sql

alter table public.module alter column admin_docs set default jsonb_build_object(
  'fiche_positionnement', false,
  'supports_moodle', false,
  'sujets_grilles_moodle', false
);

comment on column public.grade.is_group_grade is
  'Plus lu ni écrit (lot 6) : le type vient de assessment.is_group_grade, la cible de student_id / student_group_id.';
comment on column public.assessment.submission_mode is
  'Plus lu ni écrit (lot 6) : submit_mode fait foi (app / elsewhere).';
comment on column public.student.scholar_group is
  'Plus lu ni écrit (lot 6) : la promotion est dans student_year.scholar_group, par année.';
comment on column public.student.photo_url is
  'Plus lu ni écrit (lot 6) : la photo est dans photo_path (bucket student-photos).';
comment on column public.module.hours_lecture is 'Plus saisi ni affiché dans l''appli (lot 6), gardé en base.';
comment on column public.module.hours_td is 'Plus saisi ni affiché dans l''appli (lot 6), gardé en base.';
comment on column public.module.hours_tp is 'Plus saisi ni affiché dans l''appli (lot 6), gardé en base.';
