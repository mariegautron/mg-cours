# Décisions de la nuit du 9 au 10 novembre (2e fil, worktree `mg-cours-parcours`)

Arnaud m'a demandé de trancher sans l'attendre, en choisissant l'option la plus prudente et réversible. Chaque décision est notée avec sa raison. À relire et à corriger si besoin.

## Migrations à appliquer (dans cet ordre)

Ce sont trois nouveaux fichiers dans `supabase/migrations/`. Aucun ne modifie de ligne existante : ils ajoutent seulement des colonnes nullables, une table et des fonctions.

1. `20261201000000_course_resource_sections.sql` : parties d'un cours choisies par séance (deux colonnes nullables sur `course_resource`).
2. `20261201000100_module_student.sql` : inscription étudiant·e ↔ module et « A quitté le module ». Nouvelle table `module_student`, remplie avec les membres actuels des groupes de chaque module.
3. `20261201000200_feedback_respondent.sql` : questionnaire d'avis, une réponse par navigateur (colonne `respondent_hash`, et une nouvelle version à 3 arguments de `mg_feedback_submit`).

**Le code fonctionne sans ces migrations**, comme avant : il retombe sur l'ancien comportement. On peut donc pousser le code d'abord et appliquer les migrations ensuite.

## Décisions

- **« Archivé » plutôt que « Rangé »** : c'est le terme déjà en place sur main (décision du coordinateur).
- **Export** : les observations restent hors de l'export (ta décision). L'export est découpé en deux boutons, « données » et « fichiers ». Pour les fichiers, c'est le navigateur qui télécharge et construit le .zip, ce qui évite le délai dépassé de Vercel.
- **Import, rapprochement par nom** : une fiche est reconnue par son e-mail, sinon par son prénom et son nom. Quand un nom est porté par deux fiches, il n'est pas rapproché (on crée plutôt que de mélanger deux personnes). L'e-mail du fichier ne remplace jamais celui de la fiche : l'aperçu signale seulement la différence.
- **Lien des slides** : plus de champ de saisie, ni sur la séance ni sur le module. Les liens déjà remplis restent en lecture seule (« Slides d'origine (Figma) ») ; sur le module, ils sont gardés par un champ caché pour ne jamais être effacés.
- **Parties d'un cours** :
  - cocher toutes les parties revient à « tout le cours », et les nouvelles parties suivent alors d'office ;
  - une partie ajoutée plus tard n'est jamais ajoutée d'office à une séance qui a choisi des parties : la séance la signale (« L'ajouter »).
- **« Remplacer par les parties du cours »** sur les 221 morceaux Notion : pas fait. Aucun morceau n'est dans un déroulé, donc l'action ne servirait qu'à archiver, et je n'archive rien sans toi.
- **« A quitté le module »** : la personne sort du compte des appréciations et du QCM (tirages, liens, copies). Elle reste visible, grisée, avec la date de départ, et le départ s'annule.
  - Pas encore exclue de la vue privée en classe ni de la correction des évaluations de groupe : à faire ensuite.
- **Inscription** : l'assistant de groupes ne propose plus que les inscrit·es du module. Quand il n'y en a aucun·e, il affiche « Ta classe n'est pas encore là », avec un lien « Choisir dans toute la base » pour le cas exceptionnel.
- **Questionnaire d'avis** : le jeton du navigateur est aléatoire et seul son haché est stocké, ce qui garde l'anonymat. Les pages étudiantes du questionnaire passent au tutoiement, comme demandé. Les pages du QCM restent au vouvoiement, comme le texte demandé (« Vous êtes bien … ? »).
- **Facture** : rien n'est supprimé côté Factur-X. Dans Documents, le second dépôt de facture est remplacé par un lien vers la page Facture : ce sont les mêmes fichiers, rien n'est perdu.
- **QCM « sans chrono »** : pas fait cette nuit. Le 1er fil a le chrono du QCM de rattrapage, je ne voulais pas toucher aux mêmes fichiers. À reprendre avec lui.
- **Jalons sur le tableau de bord et la page Jalons** : laissés au 1er fil (point d'étape).
