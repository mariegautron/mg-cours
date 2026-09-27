# Spec — Banque de questions, QCM et passation en ligne par les étudiant·es

> Prompt de développement (à donner tel quel à une session de dev). Origine : migration
> Notion / Moodle (E8) — la banque de 69 questions du cours « Gestion d'un projet IT »
> (sauvegarde Moodle `A2526_0172`) sera migrée dans cette fonctionnalité une fois livrée.

## Contexte

MG COURS gère déjà les évaluations (`assessment`, multi-groupes via `assessment_group`,
barème `max_score`, notes `grade`). Les QCM sont aujourd'hui faits dans Moodle. Objectif :
créer et faire passer les QCM **dans MG COURS**, la note alimentant directement
l'évaluation (compteur YNOV, moyennes, PDF de résultats).

## Périmètre

### 1. Banque de questions (côté enseignante, authentifiée)

- Table `question` : `owner_id`, `category` (texte libre, ex. « Scrum »), `name` (code
  court, ex. `SCRUM03_Roles`), `type` (`single_choice` | `multiple_choice` | `true_false`
  | `numerical` | `open`), `statement` (Markdown), `general_feedback` (Markdown),
  `default_points` (numeric, défaut 1), `tags text[]`, `archived_at`.
- Table `question_choice` : `question_id`, `position`, `text` (Markdown), `is_correct`,
  `fraction` (numeric −1…1, pour les QCM à plusieurs réponses / points négatifs),
  `feedback`.
- `numerical` : valeur attendue + tolérance (colonnes sur `question`, ou `question_choice`
  avec `value`/`tolerance`).
- Écran `/questions` : liste filtrable (catégorie, type, tag, recherche plein texte),
  création / édition / duplication / archivage, aperçu tel que vu par l'étudiant·e.
- Import : **Moodle XML** (format standard d'export de banque) et reprise depuis la table
  d'import (voir « Migration »). Export Moodle XML (bonus).
- Historique : si une question déjà utilisée dans un QCM passé est modifiée, les
  passations conservent la version figée (voir `quiz_question.snapshot`).

### 2. QCM (quiz) relié à une évaluation

- Table `quiz` : `owner_id`, `assessment_id` (unique, 1 quiz ↔ 1 évaluation, type
  « QCM »), `title`, `instructions` (Markdown), `duration_minutes` (null = libre),
  `opens_at`, `closes_at`, `attempts_allowed` (défaut 1), `shuffle_questions`,
  `shuffle_choices`, `show_results` (`never` | `after_submit` | `after_close`),
  `status` (`draft` | `published` | `closed`).
- Table `quiz_question` : `quiz_id`, `question_id`, `position`, `points`, `snapshot jsonb`
  (énoncé + choix figés à la publication).
- Création depuis l'évaluation : « Créer le QCM » → choix des questions (sélection
  manuelle, ou tirage aléatoire N questions par catégorie), ordre, points.
- Barème : `assessment.max_score` = total des points ; la note est ramenée sur 20 par la
  logique existante.

### 3. Passation par les étudiant·es (sans compte)

Les étudiant·es n'ont pas de compte MG COURS. Accès par **lien personnel** :

- Table `quiz_access` : `quiz_id`, `student_id`, `token` (≥ 128 bits aléatoires, stocké
  **haché** — seul le lien envoyé contient le jeton clair), `sent_at`, `used_at`.
- Génération des liens pour tous les membres des groupes visés par l'évaluation ; envoi
  par e-mail (Resend, déjà en place) si l'étudiant·e a un e-mail, sinon export CSV /
  affichage d'un code à donner en classe.
- Alternative « en classe » : un **code de session** court affiché au vidéoprojecteur +
  choix de son nom dans la liste du groupe + code personnel à 6 caractères (à définir ;
  le lien personnel reste la voie principale).
- Route publique `/q/[token]` hors garde d'auth (`proxy.ts`), rendu serveur uniquement :
  - vérifie jeton (haché), fenêtre `opens_at`/`closes_at`, statut `published`, tentatives ;
  - affiche consignes → questions (ordre éventuellement mélangé, figé par tentative) ;
  - **sauvegarde automatique** des réponses (Server Action / Route Handler), reprise si la
    page est fermée, chrono serveur si `duration_minutes` ;
  - soumission → correction automatique (sauf questions ouvertes) → `grade` créé ou mis à
    jour pour l'évaluation (`value` = points obtenus, `scores` = détail par question).
- Table `quiz_attempt` : `quiz_id`, `student_id`, `started_at`, `submitted_at`,
  `answers jsonb`, `score`, `auto_score`, `manual_score` (questions ouvertes).
- Écran enseignante « Suivi » : qui a commencé / rendu, notes, correction manuelle des
  questions ouvertes (avec commentaires prédéfinis existants), réouverture d'une
  tentative, prolongation individuelle (tiers-temps).
- **Aucune donnée d'autres étudiant·es** exposée sur la route publique (ni noms du groupe,
  ni notes) ; aucun identifiant interne dans l'URL autre que le jeton.

### 4. Sécurité (non négociable)

- Toute écriture passe par des Server Actions / Route Handlers ; la route publique utilise
  un client serveur à droits restreints : fonction SQL `security definer` dédiée
  (`mg_quiz_session(token_hash)`, `mg_quiz_save(token_hash, answers)`,
  `mg_quiz_submit(token_hash)`) qui ne renvoie que le strict nécessaire — **jamais** la
  clé service role côté navigateur, pas de lecture directe des tables par l'anonyme.
- RLS `owner_id = auth.uid()` sur toutes les nouvelles tables (convention
  `mg_apply_conventions`).
- Limitation de débit sur `/q/*` (par jeton et par IP), jetons à usage limité à la fenêtre
  du quiz, révocables.
- Les bonnes réponses ne sont **jamais** envoyées au navigateur avant soumission.

### 5. Accessibilité (RGAA 4.1 / WCAG 2.1 AA)

- Chaque question = `fieldset` + `legend` ; choix = vrais `input radio/checkbox` avec
  `label` ; navigation clavier complète ; focus visible ; chrono annoncé sans
  interruption excessive (`aria-live="polite"`, alerte à 5 min et 1 min) ;
  `prefers-reduced-motion` ; aucune information par la couleur seule (bonne/mauvaise
  réponse doublée d'un texte) ; zoom 200 % sans perte.
- Tiers-temps : durée par étudiant·e surchargeable.

### 6. Migration (E8)

- La banque Moodle du cours GP (69 questions, 10 catégories, bonnes réponses et retours
  dans `questions.xml` de la sauvegarde `.mbz`) sera importée par le script
  `scripts/notion-migrate/` dans `question` / `question_choice` (idempotent via
  `import_ref`), puis un `quiz` rattaché à l'évaluation « QCM » du module GP 2025-26 —
  **sans passations** (les notes historiques viennent déjà du carnet Moodle).
- En attendant, la banque est importée comme **ressource Markdown** « QCM — Gestion de
  projet (questions et réponses) » ; elle pourra être archivée après migration.

### 7. Tests

- Vitest : correction automatique (choix unique, multiple avec fractions et négatifs,
  vrai/faux, numérique avec tolérance), calcul de note ramenée sur 20, parsing Moodle XML,
  mélange déterministe par tentative.
- e2e + axe : créer une banque → un QCM relié à une évaluation → générer un lien → passer
  le QCM en navigation clavier (session anonyme) → soumettre → note visible dans
  l'évaluation ; jeton invalide / hors fenêtre / tentative épuisée → messages clairs ;
  0 violation axe sur la route publique.

### 8. Docs

`docs/DATA-MODEL.md` (nouvelles tables), `docs/SPEC.md` (écrans), `docs/BACKLOG.md`
(nouvelle US), `docs/DECISIONS.md` (ADR : passation sans compte par lien personnel,
fonctions `security definer`).
