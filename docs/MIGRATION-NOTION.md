# Migration Notion → MG COURS (E8)

> Compte-rendu de l'étude, pour reprendre si la session s'interrompt.
> Source : espace Notion « 🎓 Enseignement » (`34f903c74f138112be7cdc4278f5d63f`)
> **+ la page « [Ynov] Accessibilité & Qualité Web »** rangée dans « 🗂️ Archives »
> (`1b3903c74f13808bac1ac1a9c7291e96`).
>
> **Périmètre validé par la PO (23/09/2026)** : ces 8 racines **et toutes leurs
> sous-pages, récursivement** — les 3 cours Ynov, PROGRESSION PÉDAGOGIQUE, [2025] Cours
> Template, 📚 Bibliothèque pédagogique (dont « Notes prépa cours gestion de projet »),
> [Ynov] Accessibilité & Qualité Web. Le reste de « 🗂️ Archives » est **hors périmètre**.
> **Aucune donnée n'a été écrite** (ni dans Notion, ni dans la base MG COURS).
> Ce fichier ne contient **aucun nom d'étudiant·e** : uniquement des volumes.

## Avancement

| Phase                       | Statut                          |
| --------------------------- | ------------------------------- |
| 1 — Étude (lecture seule)   | ✅ 23/09/2026                   |
| 2 — Tri avec la PO          | 🚧 proposition 26/09, à valider |
| 3 — Rattachement (modules…) | ⏳                              |
| 4 — Script `notion-migrate` | ⏳ (uniquement après OK écrit)  |

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
| Accessibilité / Oral certification   | page              | 1      | 2025-07        | —                    | certification passée par la PO (hors cours)                                                                                  |
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

### F. [Ynov] Accessibilité & Qualité Web (🗂️ Archives, mars–mai 2025)

Première version du cours d'accessibilité (3 séances de 4 h, jalons conception → audit →
production, orientée Opquast).

| Élément                                                  | Volume                                 | Cible proposée                    | Remarques                                                                                       |
| -------------------------------------------------------- | -------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Page racine : plan des 3 séances + évaluations           | 1 page (3 séances)                     | `module` + `course` ×3            | objectifs / déroulé / critères Opquast par séance ; 3 évaluations pondérées 30 / 30 / 40 %      |
| Projet fil rouge (consignes)                             | 1 page                                 | `resource`                        | lien Google Docs externe                                                                        |
| Groupes projet                                           | 1 page texte                           | `student_group` ×7                | ⚠️ **prénoms seuls**, en texte libre (pas de base)                                              |
| Grille d'évaluation – Phase conception                   | 1 page (24 critères /80)               | `grading_grid` + `grid_criterion` | barème 0 / 1 / 3 pts                                                                            |
| Pages « Note - Groupe 1…6 » (conception)                 | 6                                      | `grade` (groupe)                  | sous la grille                                                                                  |
| Oral : pages « Groupe N – nom du projet »                | 6                                      | `grade.feedback` ou —             | notes brutes prises pendant l'oral                                                              |
| Oral / Note projet : grille + « Groupe N – Note projet » | 1 + 6                                  | `grading_grid` + `grade`          |                                                                                                 |
| Correction évaluations individuelles (base)              | ~30 (5 vus : vue filtrée sur 1 groupe) | `student` + `grade`               | ⚠️ NOM Prénom, note /20 et /30, appréciation, lien PR GitHub, statut « à rentrer dans HP »      |
| Base « Pull Requests GitHub »                            | non comptée                            | —                                 | liée aux copies individuelles                                                                   |
| **Commentaires selon les erreurs fréquentes**            | **11**                                 | **`predefined_comment`**          | seule source de commentaires prédéfinis de l'espace (tabindex, alt, label, skip link, outline…) |

### E. Divers

| Élément                       | Volume                                 | Cible | Remarques                                         |
| ----------------------------- | -------------------------------------- | ----- | ------------------------------------------------- |
| [2025] Cours Template         | 8 bases + 5 vues (volumes non comptés) | —     | gabarit ; la structure est déjà reprise par l'app |
| MG COURS - Documentation (×2) | 2 pages                                | —     | cadrage du projet, déjà dans `docs/`              |

## Points d'attention

**Source suivante (après Notion)** — contenus déposés sur **Moodle** (supports, sujets,
grilles) : à compléter ensuite. Import `.mbz` / CSV prévu hors MVP (`IMPORTS.md`) ; à
réévaluer une fois la migration Notion faite (dédoublonnage Notion ↔ Moodle).

**Données étudiantes sensibles** — ~102 fiches (30 + 27 + 15 + ~30 en archives) avec notes, appréciations
nominatives, profil technique, affectations de groupe ; 11 groupes avec appréciations
collectives, dépôts GitHub/déploiements d'étudiants. Cohortes 2025 terminées : l'intérêt de
les importer (vs. RGPD / minimisation) est à trancher. Aucun e-mail dans Notion.

**Pièces jointes** (fichiers Notion, URLs signées temporaires) : ~11 PDF de slides,
3 docx/html d'évaluations, 2 fichiers de slides d'oral (pptx, pdf), 8 captures (page
client 2023). Liens externes : Figma, Canva, Kahoot. Upload livré : bucket
`resource-files` + `resource.files` ; les images du Markdown au chemin relatif s'affichent si
le fichier de même nom est déposé sur la ressource (le script peut donc les importer).

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

## Phase 2 — Tri (proposition, en attente de validation)

> **26/09 — méthode changée par la PO : tri cours par cours** (un cours proposé → retours
> de la PO → cours suivant). La liste globale ci-dessous sert de base de départ.

`[x]` = recommandé · `[ ]` = non recommandé · `[?]` = décision PO nécessaire.
Rien ne sera écrit tant que la PO n'a pas validé cette liste **et** les changements de
schéma ci-dessous.

### Principe de modélisation retenu (ADR-005, sans nouvelle table)

- **Séance Notion → `course`** (date, type, objectifs, animation, évaluation, matériel,
  slides).
- **Activité pédagogique Notion** :
  - si sa page a du contenu → **`resource`** (Markdown) liée à la séance via
    `course_resource` (`primary` pour la 1re, `secondary` ensuite) ;
  - sinon (ex. « Sprint 2 », « Feedback ») → une ligne dans `course.animation_notes`
    (créneau + nom) ;
  - objectif / compétences RNCP / notions → `course.learning_objectives` et
    `resource.tags`.
- **Page de cours Notion → `module`** (école YNOV) ; modules passés marqués comme terminés
  (voir S2).

### Lot 1 — Bibliothèque et ressources (contenu réutilisable)

- [x] Accessibilité : 17 pages de cours + atelier flashcards → `resource`
- [x] « Tutoriel onglets – Inclusive Components » → `resource` (gardé à part, lien vers
      « Créer des onglets »)
- [ ] « Oral certification RGAA » : certification passée par la PO elle-même, sans lien avec les cours
- [x] « Ressources accessibilité » (liens 2023) → 1 `resource`
- [ ] « Diagnostic Accessibilité » + « Informations accessibilité » (mission client 2023)
- [x] Gestion de projet : 3 pages → `resource`
- [?] « Notes prépa cours gestion de projet » + « Notes prépa B2 a11y » → `resource` tag
  `notes-prepa` (ou ignorées)
- [x] Numérique responsable : 3 pages → `resource`
- [x] Base Ressources M2 : 38 liens → `resource` (url, catégorie, tags = « Types »)
- [?] Doublons Chrome/Firefox (HeadingsMap, WAVE, axe DevTools) : fusion en 1 fiche avec
  les 2 liens dans le contenu (recommandé) ou 6 fiches
- [x] 2 fiches « texte masqué » de même URL → fusionnées
- [x] Briefs projets M2 (3), brief SantaConnect, consignes « Oral de projet » (1 des 2
      doublons), consignes projet fil rouge (archives), atelier « Houston » → `resource`

### Lot 2 — Modules et séances

- [x] **M2 Accessibilité 2025** → `module` + 4 `course` (Jour 1–4) + activités (14 + pages
      bibliothèque liées)
- [x] **Gestion de projet 2025** → `module` + 8 `course` datés + 19 activités
- [x] **B2 Accessibilité 2026** → `module` + 5 `course` depuis **PROGRESSION
      PÉDAGOGIQUE** (source la plus complète)
- [ ] Base Séances B2 (5 lignes sans date, doublon de la progression)
- [?] **[Archives] Accessibilité & Qualité Web 2025** : module historique (3 séances) ou
  seulement ses éléments réutilisables (grilles, commentaires, consignes) →
  recommandé : **éléments réutilisables seuls**
- [ ] [2025] Cours Template, 2 pages « MG COURS - Documentation »

### Lot 3 — Évaluations, grilles, commentaires

- [x] Grilles : M2 projet fil rouge (/30, ~27 critères, réf. RGAA en description), M2 oral
      projet (/20, 7 critères), GP dossier de cadrage (8 critères /20), GP specs & méthodo
      (9 critères /20), GP présentation orale, B2 ×3, archives conception (24 critères
      /80) et note projet
- [ ] « Grille QCM » M2 (vide) ; modèles de page en double dans les « Suivi corrections »
- [x] Évaluations des modules importés (M2 ×2, GP ×4, B2 ×3) → `assessment` (type,
      grille, date de la séance)
- [ ] QCM final M2 (« à préparer », vide)
- [x] **11 « Commentaires selon les erreurs fréquentes »** → `predefined_comment`
      (catégorie `advice`, tags thématiques ; texte = titre + corps)

### Lot 4 — Étudiant·es, groupes, notes (données personnelles)

Toutes les cohortes sont **terminées** (dernière : B2, 05/02/2026) et les notes sont déjà
dans Hyperplanning.

- [?] **Option A — recommandée** : ne rien importer (ni étudiant·es, ni groupes, ni
  notes, ni appréciations) → minimisation RGPD, pas de « bruit » dans les compteurs
- [?] Option B : importer groupes + notes de groupe seulement (sans individus)
- [?] Option C : tout importer (~102 fiches, 25 groupes, ~50 notes, appréciations)
- [ ] Dossiers de cadrage (livrables d'étudiants), base « Pull Requests GitHub », notes
      brutes d'oral

### Lot 5 — Pièces jointes

- [?] **Option A — recommandée** : créer un stockage de fichiers (bucket privé) et y
  importer les ~15 fichiers de cours (PDF de slides, sujets docx/html) dans
  `resource.files` / `course.slides` — débloque aussi US-01 (E2)
- [?] Option B : pas de fichiers, seulement leur nom + lien Figma/Canva/Kahoot/Google Docs
  dans le contenu
- [ ] Captures de la page client 2023, slides d'oral des étudiant·es

### Changements de schéma proposés (migration à valider)

| #   | Changement                                                                                                                                   | Pourquoi                                                                                                                                                                                      | Obligatoire ? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| S1  | Table **`import_ref`** (`source` `notion`\|`moodle`, `source_id`, `target_table`, `target_id`, unique `(owner_id, source, source_id)`) + RLS | Rejouer le script **sans doublons** ; resservira pour Moodle. Évite d'ajouter une colonne dans 8 tables.                                                                                      | Oui           |
| S2  | **`module.archived_at`** + filtre dans tableau de bord / facturation / listes (bascule « afficher les archivés »)                            | Les modules 2025 ne doivent déclencher ni alerte de trame ni ligne « à facturer ». Alternative sans schéma : `iceberg_state = 'paid'` (masque la trame mais le module reste dans les listes). | Recommandé    |
| S3  | Bucket Storage **`course-files`** privé + politiques `owner_id`                                                                              | Pièces jointes (lot 5, option A)                                                                                                                                                              | Si lot 5 = A  |

Pas besoin de nouvelle table « activité » (ADR-005 suffit), ni de colonne « promotion ».

### Source des données pour le script

Recommandé : **export ZIP Notion** (Markdown & CSV, **sous-pages incluses**, fichiers
inclus) des 8 racines, à faire par la PO. Les noms de fichiers de l'export contiennent l'id
Notion → clé d'idempotence stable. (Alternative : jeton d'intégration API Notion — contraire
à ADR-003.)

## Tri cours par cours

### Cours 1 — [2026] Ynov B2 Accessibilité & Qualité Web (proposition 26/09)

Sources lues : page du cours, PROGRESSION PÉDAGOGIQUE, 3 évaluations, 3 grilles, « Notes
prépa B2 a11y » (+ 2 sous-pages), « Atelier Houston ».

**Module** : « Accessibilité & Qualité Web » · YNOV · niveau « Bachelor 2 INFO & CYBER » ·
année **2025** (année scolaire 2025-26, convention YCODE `A2526`) · 20 h (5 × 4 h) · 1re
séance 08/01/2026 · fin 05/02/2026 · YCODE ? · archivé (S2).

**Séances** (depuis PROGRESSION ; objectifs → `learning_objectives`, modalités d'animation /
d'évaluation / matériel → champs dédiés) :

| #   | Date       | Titre                                                            | Type         | Promo        |
| --- | ---------- | ---------------------------------------------------------------- | ------------ | ------------ |
| 1   | 08/01/2026 | Introduction à l'accessibilité numérique et à la qualité web     | `lecture`    | INFO         |
| 2   | 12/01/2026 | TP Audit Opquast (INFO) / Cours introductif (CYBER)              | `workshop`   | INFO + CYBER |
| 3   | 22/01/2026 | TP Audit qualité & accessibilité avec Opquast                    | `workshop`   | CYBER        |
| 4   | 23/01/2026 | Du constat à la correction : HTML sémantique, qualité web & ARIA | `applied`    | INFO + CYBER |
| 5   | 05/02/2026 | Évaluation individuelle et restitution orale                     | `assessment` | INFO + CYBER |

**Évaluations + grilles**

| Évaluation                                  | Type                 | Grille (critères, points)                                                                | Pièces jointes                  |
| ------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| TP Audit qualité & accessibilité (Opquast)  | groupe, écrit, 4 h   | Constats /8 · Opquast /4 · Impact utilisateur /4 · Priorisation /4                       | grille d'audit Opquast (docx)   |
| Évaluation individuelle – correction ciblée | individuelle, 45 min | Structure & navigation /6 · Formulaire /8 · Bouton /2 · Justification /4                 | questions (docx) + extrait HTML |
| Corrections ciblées & restitution orale     | groupe, oral, 10 min | Pertinence /6 · Justification par les usages /6 · Qualité technique /4 · Clarté orale /4 | —                               |

Sujet complet (consignes, extrait de code) → `assessment.subject` ; niveaux de notation
(« 6 pts : … / 4 pts : … ») → description du critère ; « rappels pédagogiques » →
description de la grille.

**Autres pages**

| Page                                             | Proposition                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Exemple de correction (éval. individuelle)       | `resource` « Corrigé » liée à la séance 5                                 |
| Notes prépa B2 a11y (plan + déroulés)            | ? — 1re version du plan, différente de PROGRESSION                        |
| Corrections grille audit (prompts de correction) | — (outil de travail personnel)                                            |
| Atelier « Houston, on a reçu l'audit »           | ? — semble être un atelier pour professionnel·les (rôles PO, commercial…) |
| Base Séances (5 lignes), bases vides             | —                                                                         |
| 15 étudiant·es (prénoms + appréciations)         | — (recommandé, cf. Lot 4)                                                 |

#### Complément Moodle (sauvegarde `.mbz` sans utilisateurs, 26/09)

- Cours Moodle « Accessibilité et qualité Web », nom court
  `…b2a2526_0121…` → **YCODE probable `A2526_0121`**.
- **Sections** : Séance Cours 1 · Séance TP · Séance Cours 2 · Séance finale (+ sections
  administratives YNOV : dépôt de la progression, évaluations formatives, enquête, annonces).
- **Supports réellement diffusés** : pour chaque notion, un PDF « [COURS] » (= page Notion
  de la bibliothèque exportée) + un PDF « [SLIDES] » (n'existe que sur Moodle) — 16 notions,
  ~35 PDF uniques (~45 Mo).
- **3 devoirs** = les 3 évaluations Notion (mêmes consignes) + pièces jointes : sujets et
  grilles en PDF, grille d'audit (docx), **site support `eval-b2-ynov-master.zip`**,
  questions (docx) + extrait HTML. ⚠️ Moodle note l'oral sur **24** (grille Notion /20).
- **7 groupes** (noms seuls, sans membres) : Groupe 1–3 INFO, Groupe 1–4 CYBER.
- 3 liens vus en cours (description longue d'image, emojis accessibles, simulateur Atalan)
  - checklist Opquast (xls, pdf, lien).
- **Non repris** : consignes et modèles YNOV (progression pédagogique, évaluations
  formatives, enquête, forums). Les modèles `Modèle de progression pédagogique_YNOV Campus
25-26.docx` peuvent servir de **gabarit de trame** (E6) — à confirmer.

**Rattachement des supports aux séances (proposé)**

| Séance MG COURS                      | Section Moodle | Ressources (Notion = contenu Markdown, Moodle = PDF joints)                                                                             |
| ------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Intro (INFO) · 2 — Intro (CYBER) | Séance Cours 1 | Intro numérique responsable, Cartes Latitudes, Théorie de l'accessibilité, Outils de tests, RGAA 10 points, Quiz NR (réponses), 3 liens |
| 2 — TP (INFO) · 3 — TP (CYBER)       | Séance TP      | Checklist Opquast (xls/pdf/lien), exemple de grille corrigée, site support (zip)                                                        |
| 4 — Du constat à la correction       | Séance Cours 2 | Contrastes, Images (`alt`), Titres, Structure HTML, Focus outline, Cache-cache CSS, Skip links, Liens, Formulaires, ARIA                |
| 5 — Évaluation + oral                | Séance finale  | (sujets dans les évaluations, champ `subject`)                                                                                          |

Les ressources de la bibliothèque sont **créées une seule fois** et resserviront aux cours
suivants (M2…) via `import_ref`, sans doublon.

**Méthode validée par la PO (26/09)** : migration **cours par cours** — valider la
proposition d'un cours → migrer ce cours (local, puis cloud sur confirmation) → cours
suivant.

#### Décisions PO — B2 (26/09)

1. Module validé : « Accessibilité & Qualité Web », Bachelor 2 INFO & CYBER, année 2025,
   YCODE `A2526_0121`, 20 h.
2. « Notes prépa B2 a11y » : hors B2 (ignorées).
3. Atelier « Houston » : atelier pro, hors cours → ignoré.
4. 7 groupes Moodle créés (Groupe 1–3 INFO, Groupe 1–4 CYBER).
5. **Une seule** évaluation TP Audit (INFO et CYBER = un même module).
6. Oral : barème **Moodle (/24)** fait foi.
7. Fichiers : attendre le stockage développé dans une autre session.
8. S1 (`import_ref`) + S2 (`module.archived_at`) : OK.
9. Étudiant·es : garder **prénom + initiale du nom** (source à trouver : Notion n'a que le
   prénom).

- Modèle de progression YNOV : non. **Progression réellement envoyée** : oui (absente de la
  sauvegarde sans utilisateurs → à fournir).
- **Cible : directement le cloud** (pas de passage en local) — simulation (dry-run) et
  rapport d'abord, écriture après OK explicite.
- Accès cloud : **option B** — la PO lance elle-même les commandes cloud (`!`), lecture et
  écriture ; simulation d'abord.
- Progression envoyée : PDF fourni (6 pages, 05/01/2026) → `module_document` de type
  `outline_sent` (bucket `module-documents`, livré par la session « documents du module »,
  commit `2e305a4`) + état de trame « envoyée ».
- **Facture liée** : n° 26-03-6 du 11/03/2026 (faite hors app), 20 h × 50 € = 1 000 € HT,
  TVA 293 B, échéance 30/04/2026. Ne peut pas aller dans `invoice` tel quel (l'app
  régénère le PDF depuis `snapshot`, absent ici) → voir proposition S4.
- Étudiant·es : pas de source prénom + initiale (pas de droits d'export Moodle probables) ;
  appréciations non conservées.
- Facture 26-03-6 **payée** → module à l'état `paid` ; PDF de la facture importé quand
  l'upload « factures » (développé par la PO) sera en ligne.
- Slides : upload développé par la PO (documents de module) → import des PDF ensuite.
- Participants Moodle (CSV, 16 lignes) : 13 étudiant·es répartis dans 6 groupes (Groupe 4
  CYBER vide) + 3 sans groupe (dont la PO). Import : **« Prénom N. »** + groupe ;
  promo (`scholar_group`) = INFO / CYBER déduite du groupe ; **ni e-mail ni appréciation**.
- 2 comptes sans groupe = étudiant·es → proposés dans **Groupe 3 CYBER** (le « groupe 3 »
  le moins rempli), à confirmer. Groupe 4 CYBER = groupe créé par erreur → **non importé**
  (6 groupes au total).

#### Script (26/09)

- `scripts/notion-migrate/` : `index.mts` (CLI), `lib/` (lecture de l'export Notion, de la
  sauvegarde Moodle, grilles / progression, écriture idempotente via `import_ref`),
  `courses/b2-accessibilite-2526.mts` (plan du cours). Node 22 (types retirés nativement).
- **Simulation par défaut** ; `--apply` pour écrire. Une ligne déjà importée n'est jamais
  modifiée (les retouches faites dans l'app sont préservées).
- Sources hors repo : `~/Bureau/exports/notion/` (export ZIP extrait),
  `~/Bureau/exports/moodle/*.mbz`, CSV des participants, PDF de la trame.
- Étudiant·es : clé d'idempotence = empreinte SHA-256 de l'e-mail (l'e-mail n'est pas stocké).
- Les 3 évaluations visent les **6 groupes projet** (`assessment_group`) : plus de groupe
  « Promo » artificiel. Éval. individuelle : chaque étudiant·e noté·e une fois.
- Images des pages de la bibliothèque (33 PNG) → bucket `resource-files` + `resource.files`,
  citées par leur nom dans le Markdown. Images des sujets d'évaluation retirées (pas de
  stockage sur une évaluation).
- Documents du module : trame envoyée (`outline_sent`) et facture 26-03-6
  (`external_invoice`, option `--invoice-pdf`).
- Oral : barème = total de la grille (20) ; Moodle notait sur 24 (modifiable dans l'app).
- Sujets complets des évaluations (Markdown) → `assessment.subject` (20 000 caractères max,
  affiché sur la page de l'évaluation et dans le PDF des résultats) — pas de ressource
  « Sujet — … » séparée ; niveaux de notation → description des critères (perdus si
  la grille est rééditée dans l'app, qui recrée les critères depuis « Libellé | points »).

#### ⏸️ Pause (26/09) — reprise après les devs de la PO

En attente de ces développements, menés par la PO dans une autre session :

1. Édition de grille sans recréer les critères + description de critère éditable.
2. Évaluation sur plusieurs groupes (`assessment_group`).
3. Sujet d'évaluation long en Markdown.
4. Fichiers et images sur les ressources (bucket `resource-files`).
5. Interface des modules archivés (`module.archived_at`).
6. Upload des slides et des factures sur le module.

**27/09 — script adapté** (points 2 à 6 livrés ; slides = lien Figma) : évaluations sur
les 6 groupes projet, sujet dans l'évaluation, images des ressources, facture 26-03-6.
Migration `20260926160000_import_ref.sql` commitée (9e25319, crée aussi
`module.archived_at`). Reste : `db push`, relancer la simulation, puis `--apply`. Rien n'est
encore écrit sur le cloud ; script non commité.

#### B2 — écriture (27/09)

- Simulation réelle sur le cloud validée par la PO (1 module, 5 séances, 21 ressources +
  33 images, 6 groupes, 15 étudiant·es, 3 grilles / 12 critères, 3 évaluations × 6 groupes,
  2 documents).
- Oral : barème **/20** conservé (la grille totalise 20 ; décision PO, remplace le /24).
- `--apply` lancé par la PO. Contrôles à faire : simulation relancée = tout « déjà importé » ;
  vérification dans l'app (modules archivés affichés).
- ⚠️ Ne pas modifier les 3 grilles du B2 dans l'app avant le correctif « édition de grille
  sans recréer les critères ».
- `--apply` exécuté sans erreur le 27/09 : tout est créé sur le cloud.
- **PDF des supports (slides / cours) et site support : non importés** (décision PO,
  économie de stockage). Seuls la trame envoyée et la facture sont stockées.
- **Notes (27/09)** : carnet de notes Moodle (export ODS, `--grades`) → 27 notes importées
  (TP audit : 6 notes de groupe · évaluation individuelle : 15 · oral : 6 notes de groupe
  **sur 24**, barème de l'évaluation = 24, ramené sur 20 par l'app). Notes de groupe
  identiques au sein de chaque groupe (vérifié). Pas de détail par critère (Moodle ne
  fournit que le total).
- 2 étudiant·es sans groupe de projet (ni TP ni oral) → groupe **« Hors groupe projet »**
  (TD), visé uniquement par l'évaluation individuelle ; retiré·es du « Groupe 3 – CYBER »
  où le premier import les avait placé·es.

### Cours 2 — [2025] Ynov Gestion de projet (proposition 27/09)

Source principale : l'export Notion est très complet (notes par critère et commentaires
compris). Moodle servira à confirmer le YCODE, le QCM et les notes individuelles.

- **Module** : Gestion de projet · YNOV · année 2025 (2025-26) · 8 séances du 05/11 au
  18/12/2025 (~28 h) · promos DEVWEB / DEVLMIOT / DATA · YCODE ? · archivé, payé ?
- **8 séances** (pages Notion « Séance N ») : date + horaires, objectifs, contenus +
  activité → animation, livrable + évaluation → modalités d'évaluation.
- **Activités** (19) : 13 avec contenu (≥ 1 000 car.) → ressources liées à leur séance ;
  6 quasi vides → ligne dans l'animation de la séance. PDF joints non importés ; images
  PNG → `resource-files` (1 AVIF non accepté).
- **Bibliothèque GP** : méthodes de gestion de projet, focus Scrum, estimation → ressources
  (séances 4 et 6).
- **Matériel client SantaConnect** : brief, mails client, organigramme, ~30 « réponses aux
  questions » du client, corrigés (stakeholder map, lecture du brief, dossier de cadrage).
- **Évaluations** : Dossier de cadrage (groupe, grille 8 critères /20) · Specs & choix
  méthodo (groupe, 9 critères /20) · Oral du projet (groupe, 8 critères /20) · QCM
  (individuel, sans grille).
- **Notes** : 18 notes de groupe (6 groupes × 3) **avec le détail par critère et les
  commentaires** (matrices de correction + pages d'oral) ; note individuelle /20 par
  étudiant·e (27) — QCM ? à confirmer.
- **Étudiant·es** : 27 → « Prénom N. », 6 groupes (appartenance connue dans Notion),
  promo → `scholar_group`.
- **Écartés proposés** : dossiers de cadrage des groupes (livrables étudiants), résumés et
  classement des groupes, notes de correction perso, liens Jira/Trello des groupes.

#### « Notes prépa cours gestion de projet » (bibliothèque GP) — classement proposé

| Sous-page                                                                                                                         | Proposition                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Mails client · Organigramme du Pôle Nord                                                                                          | 2 ressources « SantaConnect — … » (matériel du jeu client)                                                |
| 4 pages « Réponses aux questions » (brief, besoin, audit, faisabilité) + base « Réponses au questions » (30 réponses, par groupe) | 1 ressource « SantaConnect — Réponses du client », sections par séance / thème (groupe demandeur indiqué) |
| Correction stakeholder map · Correction activité 2 (lecture du brief) · Dossier de cadrage (correction modèle)                    | 3 ressources « Corrigé — … »                                                                              |
| Notes correction dossier de cadrage (commentaire global par groupe)                                                               | **Appréciation** des 6 notes de groupe « Dossier de cadrage » (en plus du détail par critère)             |
| Oral (consignes)                                                                                                                  | — doublon (94 %) du sujet de l'évaluation « Oral du projet »                                              |
| Résumé des groupes (6 pages) + Classement                                                                                         | — (synthèses et classement des groupes) ; noms d'équipe réutilisés pour les groupes                       |

#### Complément Moodle — GP (27/09)

- Cours Moodle « Gestion d'un projet IT », Mastère 1 → **YCODE `A2526_0172`**.
- Sections : QCM individuel (quiz /20, 37 points bruts), QCM rattrapage (18–21/12/2025),
  sections « Séance 3…8 » vides, dossier de supports (1 PDF fusionné, non importé).
- **Banque de questions : 69 questions** (53 QCM, 13 vrai/faux, 2 ouvertes, 1 numérique)
  classées par thème (Scrum, faisabilité, besoin, RACI, SWOT, méthodes, estimation,
  pilotage/risques, cadrage).
- 8 groupes Moodle (non utilisés : Notion a les 6 vrais groupes et leurs membres).
- Participants Moodle : 19 étudiant·es (sans groupe), dont 18 retrouvé·es dans Notion
  (27 fiches) → **Notion reste la source** des étudiant·es et des groupes.
- « Note individuelle » Notion = **note du QCM ramenée sur 20** (ex. 36,75/37 → 19,86) :
  pas besoin du carnet Moodle.
- Facture GP : **n° 26-01-5 du 04/01/2026**, « Intervention module Gestion d'un projet IT »,
  **28 h × 60 € = 1 680 € HT**, TVA 293 B → confirme 28 h et tarif 60 €/h. Payée : à
  confirmer.

#### Décisions PO — GP (27/09)

- Séances : **Notion** (datées, ce qui a été fait) ; le PDF de progression = trame envoyée.
- Facture 26-01-5 **payée** → module `paid`, archivé ; tarif 60 €/h, 28 h.
- Banque de questions → ressource « QCM — Gestion de projet (questions et réponses) »
  (bonnes réponses lues dans la sauvegarde Moodle, l'export HTML ne les contient pas) ;
  fonctionnalité QCM spécifiée dans `docs/specs/qcm-banque-questions.md`, migration de la
  banque dedans une fois livrée.
- Classement des notes de prépa validé ; groupes nommés « Groupe N – <équipe> ».
- **Appréciations individuelles conservées** → `student.personal_notes`
  (« Gestion d'un projet IT (2025-26) : … »).
- Plan : `scripts/notion-migrate/courses/gp-2526.mts` (8 séances, 23 ressources dont
  bibliothèque, matériel client, corrigés, banque QCM ; 6 groupes ; 27 étudiant·es ;
  3 grilles / 25 critères ; 4 évaluations ; 45 notes dont 18 de groupe avec détail par
  critère et commentaires ; 2 documents).
- Relations séance → pages de bibliothèque absentes de l'export (pages déplacées) :
  reprises à la main (séance 4 : méthodes, Scrum ; séance 6 : estimation).
- **2e passe GP (27/09)** : ressource « Modèle — Dossier de cadrage SantaConnect » (séance 3) ;
  « Retour d'expérience 2025 — propositions des équipes » (6 résumés, **anonymisés** :
  noms et prénoms remplacés par « [étudiant·e] », classement exclu ; séance 7) ;
  **20 commentaires prédéfinis** tirés des corrections (cadrage, specs, oral) ; PDF :
  slides de la séance 1 et « Communication & conduite du changement » → documents du
  module (type slides), « Gestion des risques » → fichier de la ressource correspondante.
- **Classement des ressources (27/09)** : les 46 ressources importées (B2 + GP) ont reçu
  type, matière et visibilité selon `docs/specs/ressources-classement.md` (passe
  `classifyResources`, ne remplit que les champs vides / non retouchés). 9 ressources en
  « Enseignante uniquement ». Nouvelle matière « Agilité » (Focus Scrum).

### Cours 3 — [2025] Ynov M2 Accessibilité (proposition en cours, 28/09)

- Progression envoyée (PDF, 6 p., 13/06/2025) : 4 jours — J1 « Introduction à
  l'accessibilité numérique et lancement du projet », J2 « Structuration sémantique,
  navigation accessible et introduction à la qualité technique », J3 « Formulaires et
  composants accessibles (modale, onglets, recherche) », J4 « Soutenances de projet et
  évaluation finale individuelle » ; objectifs, modalités d'animation, matériel par jour ;
  évaluations : projet (groupe) + oral (groupe, grille de soutenance) + **QCM individuel
  /20**. Les pages « Jour N » de Notion étant quasi vides, la progression PDF sera la source
  des séances (dates tirées des activités Notion : 11/06, 30/06, 01/07, 08/07/2025).
- Décisions PO (28/09) : QCM noté **sur 100** (notes Moodle d'origine, barème 100, ramené
  sur 20 par l'app) ; source des notes de QCM = **export Moodle** (1 écart avec Notion : 85
  → 88,50) ; profil technique → notes personnelles de l'étudiant·e (avec l'appréciation) ;
  participants Moodle non utilisés (Notion a les 30 étudiant·es et leurs 5 groupes) ;
  banque de 60 questions → ressource (bonnes réponses à lire dans la sauvegarde `.mbz`).
- Pas de sauvegarde Moodle (cours fait dans Notion) : banque de questions lue dans l'export
  HTML, **sans les bonnes réponses** ; `--moodle` devenu facultatif.
- Facture **25-08-3** (Nantes Ynov Campus) → document du module ; YCODE inconnu (à saisir
  dans l'app).

#### Plan — `courses/m2-accessibilite-2425.mts` (28/09)

- **Module** « Accessibilité & Qualité Web » · Mastère 2 (DEVWEB, DEVLMIOT) · 2024-25 ·
  28 h × 60 €/h · 11/06 → 08/07/2025 · payé, archivé, documents administratifs cochés ·
  slides Figma (`slides_url`).
- **4 journées** : titre, objectifs, animation, évaluation, matériel depuis la progression
  PDF ; déroulé horodaté des activités Notion ajouté à l'animation.
- **Ressources** : 20 activités ≥ 800 car. (cours, 1 atelier), 34 références externes
  (paires Chrome / Firefox fusionnées, doublons d'URL écartés, liens déjà importés avec le
  B2 réutilisés ; « Numérique responsable » pour Shift Project / Ledger of Harms), 3 briefs
  projet, banque QCM (60 questions, enseignante) ; 15 images.
- **5 groupes**, **30 étudiant·es** (« Prénom N. », promo, appréciation + profil technique
  en notes personnelles).
- **Grilles** : projet fil rouge (30 critères = 29 + bonus 0,5) ; soutenance orale (7
  critères /20).
- **Notes** : projet /30 (5 notes de groupe, détail par critère, commentaire final,
  appréciation du groupe, technos et liens du projet) ; oral /20 (5, détail + commentaire
  global) ; QCM /100 (30, export Moodle).
- Écarts : les notes /30 de Notion dépassent la somme des critères (+0,5 à +3 selon les
  groupes, bonus appréciés hors grille) → **note Notion conservée**.
- Lecteur Notion : propriétés texte multi-lignes (appréciations) désormais lues (elles
  faisaient ignorer tout le bloc de propriétés).

#### M2 — écriture (29/09)

- Décisions PO : note du projet = **Note /20 de Notion** (arrondie ; brute /30 en commentaire) ;
  facture 25-08-3 payée ; YCODE inconnu (à saisir dans l'app) ; références externes = `resource`
  kind `reference` (32 sans séance liée, bibliothèque seulement).
- Simulation réelle validée puis `--apply` exécuté sans erreur : 1 module, 4 séances,
  43 ressources créées (14 de la bibliothèque déjà importées avec le B2, réutilisées),
  5 groupes, 30 étudiant·es, 2 grilles / 37 critères, 3 évaluations, 40 notes, 2 documents.
- Cloud : migrations `course_start_end_time` et `resource_status` poussées (elles appelaient
  à tort `mg_apply_conventions` sur des tables existantes ; corrigé, commit 2173bf4) — les
  séances des modules archivés étaient à 0 tant qu'elles manquaient.
- Carte source → cible : `docs/MIGRATION-SOURCES.md`.

#### Compléments après les nouvelles fonctionnalités (29/09) — `--course complements`

Passe unique, idempotente, qui ne complète que les champs vides ou restés tels que l'import
les a posés (aucune retouche faite dans l'app n'est écrasée). Script :
`courses/complements-fonctions.mts`.

1. **Grilles** : B2 (3 grilles) → paliers (`criterion_level`) tirés des niveaux « 8 pts / 6 pts… »,
   description ramenée à l'énoncé ; M2 projet → 6 axes (`grid_axis`), références RGAA
   (`reference`), critère « Bonus EcoIndex » en `is_bonus`. GP : rien (grilles sans niveaux
   ni sections).
2. **Commentaire par critère** : le bloc « Détail par critère » des notes de groupe (GP, M2)
   passe dans `grade.criterion_comments` ; `feedback` ne garde que le commentaire libre.
3. **Phrases réutilisables (GP, 20)** : matière « Gestion de projet » + critère lié quand il
   est sans ambiguïté.
4. **Banque QCM du M2** : passée « à construire » (réponses absentes) avec note d'intention.
5. **Horaires** : début / fin des séances GP (Notion) et M2 (de la 1re à la dernière
   activité du jour). **B2 : aucun horaire dans Notion** → à saisir dans l'app.
6. **Années scolaires** : `student_year` (année du module ; 2025-26 B2 et GP, 2024-25 M2) pour
   les étudiant·es importé·es ; les scripts d'import l'écrivent désormais eux-mêmes.

#### Compléments 2 (29/09) — `--course complements-2`

Projet fil rouge en jalons (US-88), thèmes (US-89), sujets liés aux séances (US-90) :

- **Projets** : GP « Appel d'offres SantaConnect » (brief + mails client) ; M2 « Projet fil
  rouge — site accessible » (brief). B2 : pas de projet (TP audit, écrit individuel, oral).
- **Évaluations** (10) : rôle (jalon / oral / individuelle) et rang pour GP et M2 ; toutes
  rattachées à leur séance ; état « fourni ».
- **M2** : 3 thèmes (JustiFacile, ClimActif, AssurLibre), 5 groupes affectés en mode
  « volontaires » (source : colonne « Briefs projets » de Notion).
- Non importés faute de source : ordre de passage des oraux (colonne vide), dates de rendu,
  photos. Objectif / rendu / « évalué » non extraits (déjà dans le sujet).
- Horaires M2 de Notion conservés (29 h pour 28 h facturées). **B2 : horaires à saisir.**

#### ⏸️ Pause (29/09) — reprise après les devs de la PO

État : B2, Gestion de projet et M2 importés, complétés (paliers, axes, commentaires par
critère, phrases, horaires, projets, thèmes). Reste à faire, dans l'ordre :

1. **Re-vérifier les nouvelles fonctionnalités** livrées entre-temps (`git log` depuis
   `4d85b79`, nouvelles migrations `supabase/migrations/` > `20261013000000`) et adapter les
   3 cours si besoin (même méthode : simulation, écriture après OK).
2. **B2** : horaires des 5 séances (aucun dans Notion : à donner par la PO ou à saisir dans l'app).
3. **Page Archives « [Ynov] Accessibilité & Qualité Web »** (`1b3903c74f13808bac1ac1a9c7291e96`) :
   grilles de conception /80, note projet, 11 commentaires prédéfinis « erreurs fréquentes »,
   consignes — proposition, validation, simulation, écriture.
4. Bibliothèque : pages non liées à un cours (proposition à la PO).
5. Fonctionnalité QCM : migrer les banques (B2 ? GP 69 questions avec réponses, M2 60 sans
   réponses) une fois livrée (`docs/specs/qcm-banque-questions.md`).

#### Compléments 3 (03/10) — `--course complements-3` (écrit sur le cloud)

Refonte des écrans : conventions de stockage et nouvelles tables (migrations jusqu'à
`20261101`). Valeurs par défaut de la session de pilotage, Marie n'ayant pas répondu :

- **Modules** : `finished_at` = dernière séance (B2 05/02/2026, GP 18/12/2025, M2 08/07/2025).
- **Brief GP** : 10 sections `## Titre` ; contexte client = organigramme (les mails
  « Mails client », avec les notes pédagogiques, en sortent).
- **Grilles GP** : 25 critères, attendus sous `### Attendus` en liste (points libres).
- **Imprévus** : 2 (`project_surprise`, séances 1 et 2), date d'envoi vide.
- **Livrables** : 8 (`course_plan.deliverable`) ; **appréciations** : 45 (≤ 250 car.) ;
  **rendus M2** : 18 liens (`submission_item`).
- **Non importé** : 12 appréciations > 250 car. (5 GP, 7 M2 : à raccourcir, limite
  Hyperplanning), dates de factures, bilans de module, attendus de l'école, banques QCM
  (à faire, catégorie « À classer »).

#### Compléments 4 (03/10) — `--course complements-4` (écrit sur le cloud)

- **Séances faites** : 17 (`course.completion = 'done'`, modules terminés).
- **Tags** de 6 ressources d'activités (type, objectif pédagogique).
- **Banque de questions** : 129 questions + 423 choix, catégorie « À classer ». GP 69 avec
  bonnes réponses (sauvegarde `.mbz`) ; M2 60 **sans bonne réponse** (export HTML) : 58 à
  reprendre (47 à cocher, 11 associations importées en « ouverte »), tag « réponses à
  définir ». Les ressources-banques en Markdown restent en place.
  À faire : sauvegarde `.mbz` du M2 pour importer les vraies réponses ; 2 questions GP
  ouvertes portent le même nom (`OUV_TRI02_TriangleOr_SansSpoiler`), à renommer.
- **Doublon « Livrable »** retiré de `course.assessment_notes` (8 séances GP).
- **Évaluations** (10) : `exam_kind` (oral / qcm / in_class / files) ; `submission_mode =
manual` pour le projet fil rouge M2 (liens de rendu).
- Restent : horaires B2, 12 appréciations > 250 car., fiches YNOV (Rapprochement), photos,
  page Archives « [Ynov] Accessibilité & Qualité Web » (proposition : 11 phrases, grille /80).

#### Fiche école GP et édition archivée « Accessibilité & Qualité Web » (03/10)

- **Fiche école GP** (texte, A2526_0172) : `--course complements-5` prêt (commit d115353) :
  10 attendus (`origin = 'school'`) + `student_intro` si vide. Module GP déjà conforme
  (28 h, YCODE, année 2025) ; les 8 séances totalisent 28 h. **En attente** : simulation puis
  validation de la PO.
- **Édition archivée** (fiche F2B2ACCESSIB, 16 h, Bachelor 2 Initial, 2024/2025, Opquast) =
  page Archives « [Ynov] Accessibilité & Qualité Web » (3 séances de 4 h = 12 h mentor + 4 h
  TD ouverts). **Décision PO (03/10) : pas importée maintenant**, à reprendre plus tard.
  Proposition prête, sans écriture :
  - **Module** archivé / terminé : « Accessibilité & Qualité Web », Bachelor 2 Initial, année
    2024, YCODE F2B2ACCESSIB, 16 h. Manquent : taux horaire, payé ou non, dates des séances.
  - **3 séances** de 4 h : Sensibilisation, légalité & conception UX/UI ; Audit & correction
    de code ; Production finale & perfectionnement.
  - **3 évaluations** pondérées 30 / 30 / 40 % (conception UX/UI et wireframe ; audit et
    correction d'une page ; production finale).
  - **Grille** de projet « Phase Conception » /80 (4 axes de 20).
  - **5 attendus** : 4 objectifs de la fiche (enjeux de l'accessibilité ; normes et pratiques
    WCAG ; qualité web et bonnes pratiques ; tests et validation) + « Développer une
    check-list qualité Web ». Prérequis HTML / CSS / JS et UI/UX → `student_intro`.
  - **11 phrases** de correction « erreurs fréquentes » (matière Accessibilité) ; 6 groupes ;
    31 fiches de correction nominatives (à n'importer qu'en « Prénom N. » si la PO le veut).
  - Variante légère : seulement les 11 phrases et la grille /80.

#### Fiches école — état (03/10)

- **GP** (texte) : `complements-5` (10 attendus + présentation) ; **B2 2025-26** (texte,
  A2526_0121) : `complements-6` (6 attendus + présentation ; module conservé à 20 h, fiche
  à 16 h) ; simulations lancées, écriture sur validation.
- **M2 2024-25** : pas de fiche, seulement l'en-tête Moodle (« M2S2-Elective 2 », Mastère 2,
  programme « Mastère2 Expert Développement Web », module « M2 Elective au choix
  informatique », semestre 2, 2024/2025, 28 h, aucun prérequis, pas de YCODE) : conforme au
  module importé. `complements-7` : 18 objectifs des 4 journées → attendus « ajoutés par
  l'intervenante » (`origin = 'custom'`) rattachés à leur journée (simulation, décision PO).
- **Édition archivée** : PDF `~/Téléchargements/B2 Accessibilité et qualité web.pdf` (fiche
  2024, Bachelor 2 Initial, 16 h) à déposer comme fiche du module archivé à la reprise.
