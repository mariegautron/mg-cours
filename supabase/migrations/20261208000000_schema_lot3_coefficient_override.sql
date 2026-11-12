-- Schéma BDD, lot 3 : coefficient imposé par l'école (`assessment.coefficient_override`).
--
-- CE QUE FAIT LA MIGRATION (purement additive) :
--   ajoute `assessment.coefficient_override numeric(5, 2)`, NULLABLE et VIDE. Rien n'est recopié
--   depuis `assessment.coefficient` : le diagnostic du 12 nov. 2026 a montré 10 évaluations
--   individuelles à coefficient 1 alors que les moyennes appliquent déjà ×3 (règle de l'école).
--   Recopier ces 1 changerait 4 moyennes de modules : on ne le fait pas.
--   Règle du code après ce lot : coefficient appliqué = coefficient_override s'il est rempli,
--   sinon la règle de l'école (groupe / individuel). `assessment.coefficient` n'est plus lu ni
--   affiché ; il n'est plus écrit que pour une « Note de l'école » (même valeur que l'override).
--
-- CE QUI CHANGE POUR MARIE : aucune moyenne ne bouge. Le formulaire d'une évaluation ne
-- demande plus de coefficient : il affiche « ×1 » ou « ×3 » selon la règle. Seule une « Note de
-- l'école » demande un « Coefficient imposé par l'école », et ce coefficient compte désormais
-- vraiment dans la moyenne (avant, la note de l'école était comptée ×3 quel que soit le
-- coefficient saisi ; il n'en existe aucune en base).
--
-- RETOUR ARRIÈRE (à faire AVEC le retour du code, sinon les enregistrements échouent) :
--   alter table public.assessment drop column if exists coefficient_override;
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot3.sql

alter table public.assessment
  add column if not exists coefficient_override numeric(5, 2)
    check (coefficient_override is null or (coefficient_override > 0 and coefficient_override <= 20));

comment on column public.assessment.coefficient_override is
  'Coefficient imposé par l''école (« Note de l''école »). Vide = règle de l''école '
  '(school_setting.group_coefficient / individual_coefficient, YNOV ×1 / ×3 par défaut).';
comment on column public.assessment.coefficient is
  'Ancien coefficient saisi, plus lu par l''application (voir coefficient_override).';
