# Migration Notion / Moodle — où est allé chaque contenu source

> Carte « source → cible » par cours, pour retrouver l'origine de chaque donnée si le
> schéma change (colonne déplacée, table renommée…). La vérité exacte est double :
>
> - le **plan du cours** : `scripts/notion-migrate/courses/<cours>.mts` (chaque ligne créée y
>   est décrite avec sa source) ;
> - la table **`import_ref`** en base : `(owner_id, source, source_id, target_table, target_id)`.
>   Elle relie chaque ligne créée à son identifiant d'origine (`notion` = id de page Notion
>   à 32 caractères, ou `<id base>#<clé>` ; `moodle` = `course:…`, `url:…`, `grade:…`).
>
> Retrouver l'origine d'une ligne : `select source, source_id from import_ref where target_table = '…' and target_id = '…';`
> Retrouver tout ce qu'un cours a produit : filtrer `import_ref` sur `target_id` des tables
> liées au module (`module_id`).
>
> Sources hors dépôt : `~/Bureau/exports/notion/` (export ZIP), `~/Bureau/exports/moodle/`
> (sauvegardes `.mbz`, CSV, ODS, PDF). Aucun nom d'étudiant·e dans ce fichier.

## Règles communes

| Source                                               | Cible                                                                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Page Notion de cours (propriétés)                    | `module` (nom, niveau, année, heures, tarif, dates, `iceberg_state`, `archived_at`, `admin_docs`)                       |
| Lien « Slides » (Figma) d'une séance                 | `module.slides_url`                                                                                                     |
| PDF de progression envoyée                           | `module_document` kind `outline_sent` (bucket `module-documents`) ; contenu des séances lu dans ce PDF ou dans Notion   |
| PDF de facture émise hors app                        | `module_document` kind `external_invoice`                                                                               |
| PDF de slides fournis                                | `module_document` kind `slides` (sauf refus PO : supports non importés)                                                 |
| Activité Notion ≥ 800 car.                           | `resource` (`kind`/`audience`/`category` selon `docs/specs/ressources-classement.md`) + lien `course_resource` à séance |
| Activité Notion courte                               | ligne du « Déroulé » dans `course.animation_notes` (pas de ressource)                                                   |
| Images locales d'une page Notion                     | bucket `resource-files` + `resource.files` (citées par nom dans le Markdown)                                            |
| Images des sujets d'évaluation                       | **retirées** (pas de stockage sur une évaluation)                                                                       |
| Base « Ressources » (liens externes, inspirations)   | `resource` kind `reference` + champ `url` ; dédoublonnées par URL (`import_ref` `moodle` `url:<url>`)                   |
| Base « Groupes projet »                              | `student_group` (+ `group_member`) ; URLs/technos/appréciation → commentaire des notes de groupe                        |
| Étudiant·e (fiche Notion / participants Moodle)      | `student` « Prénom N. » ; promo → `scholar_group` ; appréciation / profil → `personal_notes` ; **jamais d'e-mail**      |
| Grille de correction                                 | `grading_grid` + `grid_criterion` (niveaux de notation → `description` du critère)                                      |
| Sujet d'évaluation                                   | `assessment.subject` (Markdown) ; groupes visés → `assessment_group`                                                    |
| Note de groupe (matrice de correction / page d'oral) | `grade` (`student_group_id`, `is_group_grade`) : `value`, `scores` par `criterion_id`, `feedback`                       |
| Note individuelle (carnet Moodle / export QCM)       | `grade` (`student_id`), sans détail par critère                                                                         |
| Banque de questions Moodle                           | `resource` kind `question_bank`, audience `teacher` (lecture future dans la fonctionnalité QCM)                         |
| Commentaires récurrents des corrections              | `predefined_comment`                                                                                                    |

## Cours 1 — B2 Accessibilité & Qualité Web (2025-26) — script `b2-accessibilite-2526.mts`

| Source                                                    | Cible                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Notion `PROGRESSION PÉDAGOGIQUE` (5 séances)              | `course` ×5 (objectifs, animation, évaluation)                                       |
| Bibliothèque Notion « Accessibilité » (21 pages + 33 PNG) | `resource` ×21 (+ `resource.files`)                                                  |
| Sauvegarde Moodle B2 (`.mbz`) : cours, YCODE, groupes     | `module` (YCODE A2526_0121) ; `student_group` ×6 + « Hors groupe projet » (TD)       |
| CSV participants Moodle                                   | `student` ×15 (clé d'idempotence = empreinte SHA-256 de l'e-mail, e-mail non stocké) |
| Notion + Moodle : TP audit, évaluation individuelle, oral | `assessment` ×3, `grading_grid` ×3 (oral /20, Moodle notait /24)                     |
| Carnet de notes Moodle (ODS)                              | `grade` ×27 (6 TP groupe, 15 individuelles, 6 oral groupe)                           |
| PDF progression envoyée / facture 26-03-6                 | `module_document` `outline_sent` / `external_invoice`                                |
| Supports PDF, site support                                | **non importés**                                                                     |

## Cours 2 — Gestion d'un projet IT, M1 (2025-26) — script `gp-2526.mts`

| Source                                                                   | Cible                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Notion « Séance 1…8 » + Moodle (YCODE A2526_0172)                        | `course` ×8 ; `module`                                                                    |
| Activités Notion ≥ 800 car. (13)                                         | `resource`                                                                                |
| Bibliothèque « Gestion de projet » (méthodes, Scrum, estimation)         | `resource` (liens séance 4 et 6 **saisis à la main** : relations perdues à l'export)      |
| Notes prépa : brief, mails client, organigramme, 30 réponses client      | `resource` (« SantaConnect — … », réponses fusionnées en une)                             |
| Notes prépa : 3 corrigés                                                 | `resource` kind `answer_key`, audience `teacher`                                          |
| Notion : modèle de dossier de cadrage                                    | `resource` kind `template` (séance 3)                                                     |
| Notion : résumés des propositions d'équipes (6)                          | `resource` « Retour d'expérience 2025 » **anonymisé** (`[étudiant·e]`) ; classement exclu |
| Moodle : banque de 69 questions (bonnes réponses lues dans le `.mbz`)    | `resource` kind `question_bank`, teacher                                                  |
| Notion : 6 équipes                                                       | `student_group` ×6 « Groupe N – <équipe> »                                                |
| Notion : 27 étudiant·es (Moodle : 19, non utilisés)                      | `student` ×27 (appréciation → `personal_notes`)                                           |
| Grilles cadrage / specs / oral + QCM                                     | `grading_grid` ×3 (25 critères), `assessment` ×4 (QCM individuel /20)                     |
| Matrices de correction + pages d'oral                                    | `grade` ×18 de groupe avec détail par critère et commentaires                             |
| « Note individuelle » Notion (= QCM ramené /20)                          | `grade` ×27 individuelles                                                                 |
| Commentaires récurrents des corrections                                  | `predefined_comment` ×20                                                                  |
| PDF slides séance 1, « Communication & conduite du changement »          | `module_document` `slides` ; « Gestion des risques » → `resource.files`                   |
| Facture 26-01-5                                                          | `module_document` `external_invoice`                                                      |
| Écartés : dossiers de cadrage des groupes, classement, liens Jira/Trello | —                                                                                         |

## Cours 3 — M2 Accessibilité & Qualité Web (2024-25) — script `m2-accessibilite-2425.mts`

Pas de sauvegarde Moodle : cours fait dans Notion. YCODE inconnu (`module.ycode` vide).

| Source                                                                   | Cible                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Notion « Jour 1…4 » (dates, lien Figma) + PDF de progression             | `course` ×4 (objectifs / animation / évaluation / matériel du PDF) ; `module.slides_url`  |
| Activités Notion (28), ≥ 800 car. : 20                                   | `resource` ×20 (1 atelier « Flashcards ») ; les courtes → `course.animation_notes`        |
| Notion base « Ressources » (liens, veille, outils)                       | `resource` kind `reference` + `url` (paires Chrome/Firefox fusionnées ; doublons ignorés) |
| Références sans activité liée (32)                                       | `resource` sans lien `course_resource` (bibliothèque seulement)                           |
| Brief ×3 (JustiFacile, ClimActif, AssurLibre)                            | `resource` kind `project`, liées au jour 1                                                |
| Export HTML de la banque Moodle (60 questions, **sans bonnes réponses**) | `resource` kind `question_bank`, teacher, liée au jour 4                                  |
| Notion « Groupes projet fil rouge » ×5                                   | `student_group` ×5                                                                        |
| Notion « Étudiant·es » ×30                                               | `student` ×30 (appréciation + profil technique → `personal_notes`)                        |
| Grille « notation projet fil rouge » / « Oral de projet »                | `grading_grid` ×2 (30 critères dont 1 bonus / 7 critères /20)                             |
| « Suivi corrections » (Projet groupe 1…5)                                | `grade` ×5 (**Note /20** ; note brute /30, bonus compris, dans le commentaire)            |
| Pages « Oral groupe 1…5 »                                                | `grade` ×5 (/20, détail + commentaire global)                                             |
| Export Moodle des résultats du QCM (CSV, `Note/100`)                     | `grade` ×30 individuelles, `assessment.max_score = 100`                                   |
| PDF progression / facture 25-08-3                                        | `module_document` `outline_sent` / `external_invoice`                                     |
| Écartés : participants Moodle (Notion fait foi), rendus étudiants        | —                                                                                         |

## À retenir si le schéma évolue

- **Notes** : tout est dans `grade` (`value`, `scores` jsonb clé = `criterion_id`, `feedback`).
  Si le détail par critère change de forme, le migrer depuis `grade.scores` + `grid_criterion.position`.
- **Bonus** : la grille M2 contient un critère bonus (« Bonus : EcoIndex… ») stocké comme
  critère ordinaire (`weight` 0,5) ; la note /20 officielle inclut des bonus hors grille.
- **Références externes** : `resource.kind = 'reference'` + `url`. Si un type « lien » distinct
  apparaît, filtrer sur ce `kind`.
- **Appréciations étudiantes** : `student.personal_notes`, préfixées par le nom du cours.
- **Fichiers** : `resource.files` (bucket `resource-files`), `module_document` (bucket `module-documents`).
