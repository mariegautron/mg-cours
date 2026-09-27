# Spec — Ressources : type, matière, visibilité

> Prompt de développement. Origine : migration Notion / Moodle (E8) — les ressources
> importées mélangent cours, ateliers, projet, corrigés, références ; la PO « n'arrive pas à
> se projeter ». Décisions PO du 27/09/2026.

## Modèle

- Enum `resource_kind` + colonne `resource.kind` (nullable pour l'existant, obligatoire
  dans le formulaire) :

  | Valeur          | Libellé             | Définition                                                                   |
  | --------------- | ------------------- | ---------------------------------------------------------------------------- |
  | `course`        | Cours               | Notion à connaître (même si elle contient un petit exemple appliqué)         |
  | `workshop`      | Atelier / exercice  | Activité à faire en séance : TP, exercice, jeu pédagogique, quiz de révision |
  | `project`       | Projet              | Brief, consignes, matériel de mise en situation (projet fil rouge)           |
  | `template`      | Modèle              | Gabarit à remplir par les étudiant·es                                        |
  | `answer_key`    | Corrigé             | Correction type, éléments de réponse                                         |
  | `question_bank` | Banque de questions | Questions de QCM / quiz (en attendant la fonctionnalité QCM dédiée)          |
  | `reference`     | Référence externe   | Norme, référentiel, outil, article, site                                     |
  | `teacher_notes` | Notes enseignante   | Préparation, retour d'expérience                                             |

- Enum `resource_audience` (`students`, `teacher`) + colonne `resource.audience`, défaut
  `students`. `teacher` = **jamais** diffusé aux étudiant·es.
- `category` = **matière**. Valeurs proposées (liste guidée, extensible) : Accessibilité ·
  Qualité web · Numérique responsable · Gestion de projet · Agilité.
- Tags = notions (RGAA, ARIA, formulaires, SWOT, RACI…) + projet fil rouge (« SantaConnect »).

## Écrans

- Formulaire ressource : « Type » (obligatoire), « Visibilité » (Étudiant·es / Enseignante
  uniquement), « Matière » (suggestions + saisie libre).
- `/resources` : filtres Type, Matière, Visibilité (+ recherche, tags) ; regroupement au choix
  par type ou par matière ; badge texte « Enseignante uniquement ».
- Séance et module : ressources liées **groupées par type** (Cours · Ateliers · Projet ·
  Modèles · Références · Corrigés · Banque de questions · Notes), ressources `teacher`
  repérées.

## Garde-fou

Les ressources `audience = teacher` ne sont jamais incluses dans ce qui peut partir chez les
étudiant·es : export PDF des cours, e-mails, futurs liens de QCM. Vérifier l'export PDF des
cours existant.

## Tests / docs

Vitest (filtres, exclusion `teacher` de l'export) ; e2e + axe (formulaire, filtres,
groupement, 0 violation). `DATA-MODEL.md`, `SPEC.md`, `BACKLOG.md`.

## Reclassement des ressources importées (fait par le script de migration après livraison)

| Type       | Matière               | Visibilité  | Ressources                                                                                                                                                                      |
| ---------- | --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cours      | Accessibilité         | Étudiant·es | Théorie, Outils de tests, RGAA 10 points, Contrastes, Images `alt`, Titres HTML, Structure de la page, Focus outline, Cache-cache CSS, Skip links, Les liens, Formulaires, ARIA |
| Cours      | Numérique responsable | Étudiant·es | Introduction au numérique responsable                                                                                                                                           |
| Cours      | Gestion de projet     | Étudiant·es | Intro GP IT, Cartographie des acteurs, Décomposer le besoin, Audit & SWOT, Faisabilité, Dossier de cadrage, Méthodes, Estimation, Pitch client, RACI, Pilotage, Risques, Écarts |
| Cours      | Agilité               | Étudiant·es | Focus Scrum                                                                                                                                                                     |
| Atelier    | Accessibilité         | Étudiant·es | Cartes Latitudes                                                                                                                                                                |
| Projet     | Gestion de projet     | Étudiant·es | Brief SantaConnect, Mails client, Soutenances « Appel d'offres »                                                                                                                |
| Projet     | Gestion de projet     | Enseignante | Réponses du client, Organigramme du Pôle Nord                                                                                                                                   |
| Modèle     | Gestion de projet     | Étudiant·es | Modèle de dossier de cadrage                                                                                                                                                    |
| Corrigé    | Accessibilité / GP    | Enseignante | Corrigé éval. individuelle B2, corrigé cartographie, corrigé lecture du brief, dossier de cadrage modèle                                                                        |
| Corrigé    | Numérique responsable | Étudiant·es | Quiz NR : réponses et explications (publié sur Moodle)                                                                                                                          |
| Banque     | Gestion de projet     | Enseignante | QCM Gestion de projet                                                                                                                                                           |
| Référence  | Qualité web           | Étudiant·es | Checklist Opquast                                                                                                                                                               |
| Référence  | Accessibilité         | Étudiant·es | Description longue d'une image, Emojis accessibles, Simulateur Atalan                                                                                                           |
| Notes ens. | Gestion de projet     | Enseignante | Retour d'expérience 2025                                                                                                                                                        |
