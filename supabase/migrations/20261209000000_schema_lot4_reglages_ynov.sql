-- Schéma BDD, lot 4 : les règles de notation de l'école sont en base.
--
-- CE QUE FAIT LA MIGRATION :
--   crée la ligne `school_setting` de l'école « Nantes Ynov Campus », qui n'en avait aucune
--   (diagnostic du 12 nov. 2026, section 2) : le code tournait donc sur ses valeurs par défaut.
--   Les valeurs écrites sont EXACTEMENT ces valeurs par défaut (src/lib/settings/school-rules.ts,
--   DEFAULT_SCHOOL_RULES et src/lib/ynov/notation.ts, YNOV_GRADING) :
--     - note de groupe ×1, note individuelle ×3, notes ramenées sur 20 (pas un réglage) ;
--     - paliers d'heures : 4-16 h → 1 groupe + 1 individuelle ; 20-48 h → 2 + 1 ; 52-70 h → 3 + 2 ;
--     - bonus de certification autorisé ;
--     - absent·e excusé·e à un travail de groupe : garde la note du groupe (keep_group_grade) ;
--     - modèle d'e-mail vide, appréciation 250 caractères maximum.
--   Une seule ligne insérée, seulement si l'école existe et n'a pas encore de réglage (rejouable).
--   Aucune autre ligne modifiée, aucune note touchée.
--
-- CE QUI CHANGE POUR MARIE : rien dans les moyennes ni les notes exigées. La page Réglages de
-- l'école affiche désormais des valeurs enregistrées (les mêmes qu'avant) au lieu des valeurs
-- par défaut. Le code garde les valeurs YNOV en secours (école sans réglage, module sans école).
--
-- RETOUR ARRIÈRE :
--   delete from public.school_setting ss using public.school s
--   where ss.school_id = s.id and s.name = 'Nantes Ynov Campus'
--     and ss.created_at >= '2026-11-12';
--   (seulement si Marie n'a rien changé dans les réglages depuis : sinon, ne rien faire.)
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot4.sql

insert into public.school_setting (
  owner_id, school_id, absence_rule, email_template, appreciation_max,
  group_coefficient, individual_coefficient, note_brackets, bonus_allowed
)
select s.owner_id, s.id, 'keep_group_grade', '', 250,
       1, 3,
       '[{"min_hours":4,"max_hours":16,"group":1,"individual":1},{"min_hours":20,"max_hours":48,"group":2,"individual":1},{"min_hours":52,"max_hours":70,"group":3,"individual":2}]'::jsonb,
       true
from public.school s
where s.name = 'Nantes Ynov Campus'
  and not exists (select 1 from public.school_setting ss where ss.school_id = s.id);
