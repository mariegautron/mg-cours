# Spec fonctionnelle — écrans livrés

> Complétée au fil des epics. Vue produit consolidée ; règles métier dans `YNOV-RULES.md`.

## Connexion (`/login`)

- E-mail + mot de passe (Supabase Auth, compte unique).
- Redirige vers `?next=` si présent, sinon `/dashboard`.
- `proxy.ts` protège toutes les routes hors `/login` ; utilisateur connecté sur `/login` → `/dashboard`.

## Coquille applicative (`(app)/layout`)

- Barre latérale gauche : Tableau de bord, Modules, Ressources, Étudiants, Évaluations,
  Facturation, Réglages. En-tête : bouton repli + e-mail.
- Thème sombre par défaut.

## Ressources (E2)

Support pédagogique **réutilisable** dans N modules (≈ base « Ressources » de Notion).

### Liste `/resources`

- Cartes : titre, description (2 lignes), catégorie + tags, « Utilisée dans N modules ».
- Recherche plein texte (titre + description), filtres catégorie / tag / afficher les archivées.
- État vide → invite à créer.

### Création `/resources/new` · Édition `/resources/[id]/edit`

- Champs : **titre** (obligatoire), description, catégorie, lien (URL validée), tags
  (saisie séparée par virgules → tableau), contenu (Markdown, textarea mono).
- Validation zod côté serveur, erreurs par champ reliées (`aria-describedby` + `role="alert"`).

### Détail `/resources/[id]`

- Titre, description, catégorie/tags, lien externe.
- **Utilisation** : liste des modules (nom + année) où la ressource est employée, triés par
  année décroissante ; lien vers chaque module.
- Contenu Markdown affiché en bloc préformaté (rendu riche : plus tard).
- Actions : Modifier · Archiver / Désarchiver · Supprimer (confirmation `AlertDialog`).

### Règles

- `resource.archived_at` : une ressource archivée reste liée à ses cours mais sort des listes
  par défaut.
- Suppression : `course_resource` en `on delete cascade` (les liens disparaissent, pas les cours).
- Fichiers joints : prévus (Storage), non livrés en E2.

## Modules + Cours (E3)

Un module = conteneur école/année (YCODE, heures, dates). Ses séances (`course`) sont
chacune liées à une ou plusieurs ressources réutilisables.

### Liste `/modules`

- Cartes triées par année décroissante puis nom : école · niveau · année, badges heures,
  minimum de notes, statut de la trame.

### Création `/modules/new` · Édition `/modules/[id]/edit`

- Champs : nom, école (liste `school`), niveau, année, YCODE, heures (total + FFP/TD/TP),
  dates (début, **1re séance**, fin), référence bon de commande.
- La date de 1re séance sert au calcul de l'échéance de la trame (J-15).

### Détail `/modules/[id]`

- En-tête : école, niveau, année, YCODE ; badges heures / **minimum de notes requises**
  (`requiredNotes`, ex. 21 h → « 3 notes min. (2 groupes + 1 individuelle) ») / état iceberg.
- **Trame pédagogique** : badge d'échéance (`trameStatus`) —
  `ok` (> J-15) · `warning` (≤ J-15) · `urgent` (≤ J-7) · `overdue` (dépassée) ·
  `sent` (dès `iceberg_state ≥ outline_sent`) · `unknown` (pas de date de 1re séance).
  Génération réelle de la trame PDF : E6.
- **Séances** : liste ordonnée (titre, modalité, objectifs, ressources liées, date de
  dernière MAJ du contenu) ; ajouter / modifier / supprimer une séance.
- **Documents administratifs** : 4 interrupteurs (fiche de positionnement, progression
  pédagogique, supports Moodle, sujets/grilles Moodle) → `module.admin_docs`.
- **Actions** : dupliquer vers une nouvelle année (module + séances + liens ressources,
  dates et statut remis à zéro) · supprimer (confirmation).

### Séance `/modules/[id]/courses/new` · `/modules/[id]/courses/[courseId]/edit`

- Champs : titre, modalité (cours théorique / atelier-TP / projet / évaluation /
  démonstration / cours appliqué), position, date, objectifs pédagogiques (une ligne par
  objectif), ressources liées (cases à cocher), modalités d'animation/d'évaluation, matériel.
- Toute modification met à jour `content_last_updated_at` (repris tel quel dans la trame).

### Règles

- `required_notes` et le workflow iceberg sont des fonctions pures testées
  (`src/lib/ynov/notation.ts`, `iceberg.ts`, `trame.ts`), jamais recalculées dans l'UI.
- La duplication ne copie pas les évaluations/notes (propres à une année), seulement la
  structure pédagogique (cours + ressources liées).
