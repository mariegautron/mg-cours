# Parcours principaux de MG COURS

Liste de référence pour la QA : un parcours = un objectif de Marie (ou d'un·e étudiant·e) de bout en
bout. Pour chaque parcours : écrans, e2e existants, et un espace pour noter les améliorations
trouvées en QA.

Sources : routes `src/app`, `docs/SPEC.md`, `docs/AUDIT-PARCOURS.md`, `e2e/`.
Statut QA : ⬜ à faire · 🚧 en cours · ✅ fait.

| #   | Parcours                                    | Qui      | QA |
| --- | ------------------------------------------- | -------- | -- |
| P1  | Se connecter et régler son espace           | Marie    | ⬜ |
| P2  | Alimenter la bibliothèque de ressources     | Marie    | ⬜ |
| P3  | Préparer un module (10 étapes)              | Marie    | ⬜ |
| P4  | Accueillir les étudiant·es et former les groupes | Marie | ⬜ |
| P5  | Faire cours (séance)                        | Marie    | ⬜ |
| P6  | Piloter le projet fil rouge                 | Marie    | ⬜ |
| P7  | Préparer une évaluation                     | Marie    | ⬜ |
| P8  | Corriger et noter                           | Marie    | ⬜ |
| P9  | QCM en ligne (banque, passation, résultats) | Marie + étudiant·es | ⬜ |
| P10 | Espace et liens étudiant·es                 | Étudiant·es | ⬜ |
| P11 | Progression pédagogique et envoi à l'école  | Marie    | ⬜ |
| P12 | Clôturer le module, rendre les résultats, facturer | Marie | ⬜ |
| P13 | Piloter au quotidien (tableau de bord, recherche, planning) | Marie | ⬜ |

---

## P1 · Se connecter et régler son espace

- **But** : entrer dans l'app, retrouver son mot de passe, régler écoles, règles d'école, export.
- **Écrans** : `/login`, `/login/nouveau`, `/login/oubli`, `/settings`, `/settings/schools/new|[id]/edit`.
- **e2e** : `password-reset`, `settings`, `school-rules`, `export`, `skip-link`, `shell-a11y`, `sidebar-nav`.
- **À regarder en QA** : mot de passe oublié de bout en bout, création d'école, navigation clavier, mobile.
- **Améliorations notées** :
  - …

## P2 · Alimenter la bibliothèque de ressources

- **But** : créer, classer, retrouver et faire évoluer les fiches de cours.
- **Écrans** : `/resources` (liste, familles, recherche), `/resources/new`, `/resources/[id]`, `/edit`, `/history`.
- **e2e** : `resources`, `resource-autosave`, `resource-files`, `resource-history`, `resource-paste`,
  `resource-picker`, `resource-search`, `library-families`, `global-search`.
- **À regarder en QA** : création par collage, sauvegarde auto, historique et restauration, classement, recherche.
- **Améliorations notées** :
  - …

## P3 · Préparer un module (10 étapes)

- **But** : de la fiche module et des attendus jusqu'à la progression envoyée à l'école.
- **Écrans** : `/modules`, `/modules/new`, `/modules/[id]` (Où j'en suis), `expectations`, `matching`,
  `schedule`, `import-courses`, `courses/new`, `assessments`, `project`, `outline`, `documents`.
- **Doc** : `docs/AUDIT-PARCOURS.md` (déjà audité le 4 oct. 2026), maquettes et spec Notion des 8 écrans.
- **e2e** : `first-module`, `module-create`, `module-agreement`, `hyperplanning`, `expectations`,
  `matching`, `matching-links`, `custom-expectations`, `course-import`, `course-reorder`, `next-step`,
  `journey-links`, `responsive-journey`.
- **À regarder en QA** : import Hyperplanning, rapprochement ressources/attendus, étape courante, reprise après pause.
- **Améliorations notées** :
  - …

## P4 · Accueillir les étudiant·es et former les groupes

- **But** : importer la promo, les photos, créer les groupes, faire connaissance.
- **Écrans** : `/students` (+ import, photos, détail, édition), `modules/[id]/groups` (+ `new`, `wizard`,
  `[groupId]`), `courses/[courseId]/trombinoscope`, `/present/modules/[id]/groups`.
- **e2e** : `students`, `students-views`, `student-photos`, `student-years`, `student-intro`,
  `group-wizard`, `import-groups`.
- **À regarder en QA** : import CSV avec erreurs, doublons, groupes après arrivée tardive, trombinoscope projeté.
- **Améliorations notées** :
  - …

## P5 · Faire cours (séance)

- **But** : préparer la séance, la projeter, prendre des notes, la clôturer, reprendre à la suivante.
- **Écrans** : `courses/[courseId]` (+ `start`, `edit`, `notebook`, `questions`, `close`, `closed`),
  `/present/modules/[id]/courses/[courseId]` et `/presenter`, mini-QCM de fin de séance.
- **e2e** : `present`, `presenter`, `present-qcm`, `notebook`, `attendance`, `resume`, `surprises`,
  `makeup`.
- **À regarder en QA** : projection sur un écran + vue privée sur le même portable, diapos, présence,
  carnet, clôture « faite / partielle », reprise.
- **Améliorations notées** :
  - …

## P6 · Piloter le projet fil rouge

- **But** : définir le projet, ses phases et thèmes, suivre les groupes, réutiliser d'un module à l'autre.
- **Écrans** : `modules/[id]/project` (+ `reuse`), `frise`, `/present/modules/[id]/frise`.
- **e2e** : `project`, `project-phases`, `project-themes`, `project-reuse`, `fil-rouge-ecrans`,
  `frise-etudiants`.
- **À regarder en QA** : reprise d'un projet existant, lisibilité de la frise projetée, cohérence phases ↔ évaluations.
- **Améliorations notées** :
  - …

## P7 · Préparer une évaluation

- **But** : définir l'évaluation, son sujet, sa grille, les consignes montrées **avant** le jour J.
- **Écrans** : `/assessments/grids` (+ `new`, `[gridId]/edit`), `/assessments/comments`,
  `modules/[id]/assessments` (+ `new`, `add`, `[assessmentId]/edit`), sujet, grille remise aux étudiant·es,
  suivi des rendus.
- **e2e** : `assessments`, `module-evaluations`, `evaluation-preparation`, `assessment-subject`,
  `grids`, `grid-axes`, `grid-levels`, `grid-handout`, `criterion-expectations`, `submissions`,
  `submission-items`, `individual-prep`.
- **À regarder en QA** : grille → attendus, publication aux étudiant·es, suivi des rendus, évaluation sans groupe.
- **Améliorations notées** :
  - …

## P8 · Corriger et noter

- **But** : saisir les notes, comparer les copies, corriger l'oral, rédiger les retours et appréciations.
- **Écrans** : `assessments/[assessmentId]` (saisie), `/correct`, `/compare`, `/results`, `/oral`,
  `/phrases`, `/assessments/comments`, `modules/[id]/appreciations(/[studentId])`, `rattrapages`.
- **e2e** : `grading-session`, `grade-compact`, `grade-compare`, `grade-levels`, `grade-similar`,
  `grade-feedback`, `oral`, `phrases`, `appreciations`, `assessment-bonus`, `makeup`.
- **À regarder en QA** : correction sur mobile, oral entre deux groupes, calculs de note, bonus, rattrapage, appréciations.
- **Améliorations notées** :
  - …

## P9 · QCM en ligne (banque, passation, résultats)

- **But** : constituer la banque, générer les tirages, faire passer le QCM, corriger les réponses libres.
- **Écrans** : `/questions` (+ `new`, `import`, `[id]`, `edit`), `assessments/[assessmentId]/quiz`
  (+ `generate`, `links`, `qr`, `results`, `attempts/[attemptId]`), `/present/.../quiz`,
  côté étudiant·e `/q/[token]`, `/q/classe/[token]`.
- **Doc** : `docs/SECURITY-QCM.md`.
- **e2e** : `questions`, `question-links`, `quiz`, `quiz-generate`, `quiz-class-link`, `quiz-security`.
- **À regarder en QA** : import de questions, QR en classe, une copie par étudiant·e, reprise après coupure,
  « À corriger » tant que la relecture n'est pas finie.
- **Améliorations notées** :
  - …

## P10 · Espace et liens étudiant·es

- **But** : ce que voient les étudiant·es : espace du module, cours, projet, évaluations, résultats, retour sur le module.
- **Écrans** : `/module/[token]` (+ `cours`, `cours/[n]`, `projet`, `evaluation/[n]`), `/espace/[token]/…`,
  `/resultats/[token]`, `modules/[id]/feedback` (côté Marie).
- **e2e** : `result-links`, `quiz-class-link`.
- **À regarder en QA** : liens expirés ou faux, mobile, accessibilité (RGAA), ce qui est visible avant/après évaluation.
- **Améliorations notées** :
  - …

## P11 · Progression pédagogique et envoi à l'école

- **But** : générer la progression, la télécharger, la déposer, confirmer l'envoi, gérer une progression déjà déposée en PDF.
- **Écrans** : `modules/[id]/outline`, `documents`, `planning`, `build`.
- **e2e** : `outline`, `outline-deposited`, `documents`.
- **À regarder en QA** : carte « Avant de générer », échéance dépassée, module déjà réalisé avec PDF déposé.
- **Améliorations notées** :
  - …

## P12 · Clôturer le module, rendre les résultats, facturer

- **But** : finir le module, envoyer résultats (PDF + e-mail), uploader sa facture, suivre envoyée / payée, archiver.
- **Écrans** : `modules/[id]/finish`, résultats PDF + e-mail, `modules/[id]/billing`, `/billing`, archivage / suppression.
- **e2e** : `module-finish`, `billing`, `archive`, `module-delete`, `retained`.
- **À regarder en QA** : cases envoyée / payée, vue globale `/billing`, archivage, suppression (zone sensible).
- **Améliorations notées** :
  - …

## P13 · Piloter au quotidien

- **But** : savoir quoi faire aujourd'hui, retrouver n'importe quoi, voir le calendrier.
- **Écrans** : `/dashboard`, recherche globale, `modules/[id]/planning`, `schedule`, `/modules`.
- **e2e** : `dashboard`, `global-search`, `schedule`, `sidebar-nav`, `route-states`.
- **À regarder en QA** : tableau de bord (à repenser plus tard), prochaine action, états vides, jalons.
- **Améliorations notées** :
  - …

---

## Méthode QA proposée

1. Un parcours à la fois, dans l'ordre de ta semaine réelle (P3 → P5 → P7/P8 → P12).
2. Rejouer à la main sur staging avec des données réalistes, sur ton portable et au téléphone si utile.
3. Noter dans « Améliorations notées » : écran, ce qui gêne, ce que tu attendais.
4. On trie ensuite ensemble (bloquant / confort / idée pour plus tard → boîte à idées Notion).
