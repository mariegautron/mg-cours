# Migration Notion → MG COURS (E8)

> Compte-rendu de l'étude, pour reprendre si la session s'interrompt.
> Source : espace Notion « 🎓 Enseignement » (`34f903c74f138112be7cdc4278f5d63f`).
> **Aucune donnée n'a été écrite** (ni dans Notion, ni dans la base MG COURS).
> Ce fichier ne contient **aucun nom d'étudiant·e** : uniquement des volumes.

## Avancement

| Phase                       | Statut                         |
| --------------------------- | ------------------------------ |
| 1 — Étude (lecture seule)   | ✅ 23/09/2026                  |
| 2 — Tri avec la PO          | ⏳ en attente du feu vert      |
| 3 — Rattachement (modules…) | ⏳                             |
| 4 — Script `notion-migrate` | ⏳ (uniquement après OK écrit) |

## Arborescence

```
🎓 Enseignement
├── 🏫 Ynov
│   ├── [2025] Cours M2 Accessibilité - Ynov        (juin–juil. 2025)
│   ├── [2025] Cours Gestion de projet - Ynov       (nov.–déc. 2025)
│   └── [2026] Ynov B2 - Cours Accessibilité et qualité web (janv.–févr. 2026)
├── 📚 Bibliothèque pédagogique
│   ├── Accessibilité            (21 pages)
│   ├── Gestion de projet        (4 pages)
│   └── Numérique responsable    (3 pages)
├── [2025] Cours Template        (gabarit vide de cours)
├── PROGRESSION PÉDAGOGIQUE      (trame B2 2026, 5 séances)
├── 🚀 MG COURS - Documentation Projet
└── MG COURS - Documentation Projet COMPLETE
```

Chaque page « cours » suit le même gabarit : ~8 à 11 bases pleine page (Activités
pédagogiques, Séances, Évaluations, Grilles de correction, Suivi corrections,
Étudiant·es, Groupes projet fil rouge, Ressources…) + 5 vues liées inline (pas de données
propres). Les bases ont le même schéma d'un cours à l'autre (copies du template).

## Inventaire

Légende cible : `resource` · `module` · `course` · `student` · `student_group` ·
`assessment` · `grading_grid` (+ `grid_criterion`) · `grade` · `predefined_comment` · —
(rien).

### A. Bibliothèque pédagogique (réutilisable, hors cours)

| Élément                              | Nature            | Volume | Dates          | Cible proposée       | Remarques                                                                                                                    |
| ------------------------------------ | ----------------- | ------ | -------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Accessibilité / pages de cours       | pages riches (MD) | 17     | 2025-06 → 07   | `resource` (content) | ARIA, titres, contrastes, liens, skip links, focus, onglets, `alt`, formulaires, outils de tests, atelier flashcards, intro… |
| Accessibilité / « Tutoriel onglets » | page              | 1      | 2025-07        | `resource`           | doublon partiel de « Créer des onglets accessibles »                                                                         |
| Accessibilité / Oral certification   | page              | 1      | 2025-07        | `resource` ou —      | consignes d'oral RGAA (certification)                                                                                        |
| Accessibilité / Diagnostic + Infos   | pages (2023)      | 2      | 2023-02/03     | — (recommandé)       | ⚠️ mission client (audit d'un site tiers, Jira client, 8 captures S3) — pas du contenu de cours                              |
| Accessibilité / Ressources a11y      | liste de liens    | 1      | 2023-03        | `resource` (liens)   | recoupe la base Ressources M2                                                                                                |
| Gestion de projet                    | pages riches      | 3      | 2025-10 → 11   | `resource`           | méthodes GP, focus Scrum, estimation                                                                                         |
| Gestion de projet / Notes prépa      | notes perso       | 1      | 2025-10        | `resource` ou —      | brouillon de préparation                                                                                                     |
| Numérique responsable                | pages + quiz      | 3      | 2023 → 2025-06 | `resource`           | intro NR, quiz corrigé, liens éco-conception                                                                                 |

Ces pages sont aussi les **activités pédagogiques** des séances (déplacées depuis les bases
« Activités » des cours) : les séances M2 / GP pointent encore vers elles.

### B. [2025] Cours M2 Accessibilité (juin–juillet 2025)

| Base / page                   | Volume                     | Propriétés clés                                                                   | Cible proposée                       | Remarques                                                                            |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Séances                       | 4 (Jour 1–4)               | date (1 seule renseignée : 11/06/2025), statut, slides (lien Figma)               | `course`                             | 4 journées ; heures non renseignées                                                  |
| Activités pédagogiques        | 14 (+ ~15 en bibliothèque) | nom, type, objectif, créneau horaire, fichiers, ressources liées                  | `course` (sous-partie) ou `resource` | 5 PDF de slides joints ; créneaux 11/06 → 08/07/2025                                 |
| Ressources                    | 38                         | nom, description, lien, catégorie (13), types (25 tags)                           | `resource` (url, category, tags)     | doublons Chrome/Firefox (HeadingsMap, WAVE, axe), 2 fiches même URL                  |
| Évaluations                   | 2                          | nom, type (Projet / QCM), statut, grille, séance                                  | `assessment`                         | QCM final « à préparer » (vide)                                                      |
| Grilles de correction         | 2                          | nom, statut ; **barème dans le corps de page** (tableaux)                         | `grading_grid` + `grid_criterion`    | grille projet : 6 sections, ~27 critères, /30 → /20, réf. RGAA ; « Grille QCM » vide |
| Suivi corrections             | 5                          | groupe, évaluation, note /20 et /30, statut                                       | `grade` (note de groupe)             | 5 groupes × projet fil rouge                                                         |
| Pages « Oral groupe 1…5 »     | 5                          | tableau par critère (7 critères /20) + commentaires                               | `grade` (scores + feedback)          | pages hors base, sous la page du cours                                               |
| Page « Grille oral projet »   | 1                          | barème oral /20 (7 critères)                                                      | `grading_grid`                       | = modèle des pages Oral groupe                                                       |
| Pages « Oral de projet » (×2) | 2                          | consignes de soutenance                                                           | `resource` ou `assessment.subject`   | doublon probable                                                                     |
| Étudiant·es                   | **30**                     | NOM Prénom, promo (DEVWEB / DEVLMIOT), profil tech, note indiv. (%), appréciation | `student` + `group_member`           | ⚠️ données perso : notes + appréciations ; **pas d'e-mail**                          |
| Groupes projet fil rouge      | 5                          | membres, appréciation, technos, URL repo/déploiement/kanban/maquettes, slides     | `student_group` (type `project`)     | URLs/technos/appréciation : pas de colonne équivalente                               |
| Briefs projets                | 3 (liés)                   | pages de sujet                                                                    | `resource`                           | base non visible dans l'arborescence (liée depuis les groupes)                       |

### C. [2025] Cours Gestion de projet (5/11 → 18/12/2025)

| Base / page                        | Volume | Propriétés clés                                                                                 | Cible proposée                             | Remarques                                      |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Séances                            | 8      | créneaux datés (3 h ou 4 h, ~28 h au total), statut, slides (1 PDF)                             | `course` (session_date, type)              | module ≈ 28 h                                  |
| Activités pédagogiques             | 19     | nom, statut, créneau, compétences RNCP, outils/notions, URL (Kahoot), fichiers                  | `course.learning_objectives` / `resource`  | 3 PDF joints ; RNCP et notions → tags ?        |
| Page « Brief client SantaConnect » | 1      | sujet fil rouge                                                                                 | `resource`                                 |                                                |
| Évaluations                        | 4      | Dossier de cadrage, Specs & choix méthodo, QCM, Oral                                            | `assessment`                               |                                                |
| Grilles de correction              | 3      | cadrage, specs & méthodo, présentation orale                                                    | `grading_grid`                             | + 5 modèles de page dans « Suivi corrections » |
| Corrections dossier de cadrage     | 8 × 6  | 1 ligne par critère, note + commentaire par équipe                                              | `grid_criterion` + `grade.scores/feedback` | notes en texte (« 3.5/4 ⭐ ») → à parser       |
| Corrections specs & choix méthodo  | 9 × 6  | idem                                                                                            | idem                                       | idem                                           |
| Suivi corrections                  | 18     | groupe, évaluation, note /20, statut (tous « Corrigé »)                                         | `grade` (note de groupe)                   | 6 groupes × 3 évaluations                      |
| Étudiant·es                        | **27** | NOM Prénom, promo (DEVWEB / DEVLMIOT / DATA), note indiv. /20, appréciation, « Ajouté dans HP » | `student` + `grade` (QCM ?)                | ⚠️ données perso ; pas d'e-mail ; 1 sans promo |
| Groupes projet fil rouge           | 6      | membres, lien Jira/Trello, slides                                                               | `student_group`                            |                                                |
| Dossiers de cadrage                | 6      | livrables rédigés par les groupes                                                               | — (recommandé)                             | travaux d'étudiants, pas du contenu enseignant |

### D. [2026] Ynov B2 — Accessibilité et qualité web (8/01 → 5/02/2026)

| Base / page                                                           | Volume                 | Propriétés clés                                                              | Cible proposée                   | Remarques                                                                            |
| --------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Page PROGRESSION PÉDAGOGIQUE                                          | 5 séances (20 h)       | date, titre, durée 4 h, objectifs, animation, évaluation, matériel           | `course` (tous les champs trame) | **source la plus propre** : colle 1:1 aux colonnes `course` ; 2 promos (INFO, CYBER) |
| Séances (base)                                                        | 5 (4 nommées + 1 vide) | pas de date, statut « Pas commencé »                                         | — (doublon de la progression)    |                                                                                      |
| Activités / Ressources / Groupes / Suivi                              | 0                      | —                                                                            | —                                | bases vides                                                                          |
| Évaluations                                                           | 3                      | éval. individuelle (docx + html joints), oral, TP audit Opquast (docx joint) | `assessment`                     | 3 fichiers joints                                                                    |
| Grilles de correction                                                 | 3                      | barème dans le corps de page (non lu en détail)                              | `grading_grid`                   |                                                                                      |
| Étudiant·es                                                           | **15**                 | **prénom seul**, appréciation                                                | `student` ?                      | ⚠️ pas de nom de famille ni d'e-mail → rapprochement impossible avec un import HP    |
| Pages « Notes prépa B2 a11y », « Atelier Houston, on a reçu l'audit » | 2                      | notes / atelier                                                              | `resource`                       |                                                                                      |

### E. Divers

| Élément                       | Volume                                 | Cible | Remarques                                         |
| ----------------------------- | -------------------------------------- | ----- | ------------------------------------------------- |
| [2025] Cours Template         | 8 bases + 5 vues (volumes non comptés) | —     | gabarit ; la structure est déjà reprise par l'app |
| MG COURS - Documentation (×2) | 2 pages                                | —     | cadrage du projet, déjà dans `docs/`              |

## Points d'attention

**Données étudiantes sensibles** — 72 fiches (30 + 27 + 15) avec notes, appréciations
nominatives, profil technique, affectations de groupe ; 11 groupes avec appréciations
collectives, dépôts GitHub/déploiements d'étudiants. Cohortes 2025 terminées : l'intérêt de
les importer (vs. RGPD / minimisation) est à trancher. Aucun e-mail dans Notion.

**Pièces jointes** (fichiers Notion, URLs signées temporaires) : ~11 PDF de slides,
3 docx/html d'évaluations, 2 fichiers de slides d'oral (pptx, pdf), 8 captures (page
client 2023). Liens externes : Figma, Canva, Kahoot. `resource.files` existe mais l'upload
Storage n'est pas encore livré (E2, reporté).

**Doublons** — ressources Chrome/Firefox, 2 fiches de même URL, pages « onglets » ×2,
« Oral de projet » ×2, Séances B2 vs page Progression, activités M2 dupliquées entre la
base du cours et la bibliothèque. À vérifier aussi : le module seed « Méthodologies Agile &
Scrum » recoupe le cours Gestion de projet.

**Sans équivalent dans le modèle** — statuts de préparation (Notion ≠ `prep_status`),
compétences RNCP, « Outils/Notions », profil technique, URLs/technos/appréciation de
groupe, « Ajouté dans HP », ordre de passage, note individuelle en % (M2), heures des
activités (créneaux horaires fins).

**Contraintes techniques pour la phase 4**

- Pas de clé externe pour l'idempotence : il faudra une colonne `source_ref` (id Notion)
  ou une table de correspondance ; `student` n'a d'unicité que sur l'e-mail (absent ici).
- `docs/IMPORTS.md` / ADR-003 prévoient un script lisant un **export ZIP Notion**
  (Markdown + CSV), pas l'API. Le quota de requêtes Notion (atteint pendant l'étude) va
  dans le même sens.
- Barèmes des grilles = tableaux dans le corps des pages → parsing Markdown ; notes des
  matrices GP en texte libre (« 3.5/4 ⭐ »).
- Pas de colonne « promotion » : `student.scholar_group` est le plus proche.
