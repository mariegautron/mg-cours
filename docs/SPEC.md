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

## Étudiants + Groupes (E4)

### Liste `/students`

- Cartes : prénom + nom, e-mail, promotion. Recherche plein texte (nom/prénom/e-mail),
  filtres promotion et **module** (via l'appartenance aux groupes du module).

### Création `/students/new` · Édition `/students/[id]/edit`

- Champs : prénom, nom (obligatoires), e-mail (optionnel, unique), numéro étudiant,
  promotion/groupe scolaire, notes personnelles.

### Détail `/students/[id]`

- Coordonnées, groupes auxquels iel appartient (tous modules confondus, lien vers chacun),
  notes personnelles, suppression (confirmation).

### Import `/students/import`

- Étape 1 : dépôt d'un fichier **CSV ou XLSX**, colonnes reconnues par alias tolérant aux
  accents/casse (nom, prénom, email, numéro étudiant, groupe) → aperçu ligne par ligne
  (à importer / déjà en base / en erreur), **rien n'est écrit à cette étape**.
- Étape 2 : confirmation → n'insère que les lignes valides et non déjà présentes
  (déduplication par e-mail, fichier et base).
- Les CSV texte sont décodés en UTF-8 explicitement avant parsing (voir `DECISIONS.md`).

### Groupes (`/modules/[id]/groups/…`, intégré à la page module)

- Un groupe (`student_group`) appartient à un module : nom + type (TP/TD/Projet).
- Détail d'un groupe : deux colonnes — membres actuel·les (retrait en un clic) et
  étudiant·es disponibles (ajout en un clic), sans limite de recherche pour l'instant.
- Suppression du groupe (confirmation) : retire les liens, ne supprime pas les étudiant·es.

### Règles

- Trombinoscope : `student.photo_url` existe en base ; pas d'UI d'upload en E4 (Storage non
  configuré, comme les fichiers de ressources en E2) — à ajouter avec un besoin concret.
- La comparaison automatique des notes Hyperplanning (US-39) est hors MVP ; l'étape iceberg
  `grades_in_hp` (13 états, `src/lib/ynov/iceberg.ts`) n'a pas encore de contrôle dans l'UI —
  prévu avec le reste du workflow de facturation en E7.

## Évaluations + Notation (E5)

### Grilles `/assessments/grids`

- Grille réutilisable : nom, description, critères saisis une ligne par critère
  (`Libellé | points`) ; barème = somme des points. Modifier remplace les critères.

### Commentaires prédéfinis `/assessments/comments`

- Texte, catégorie (positif / négatif / conseil), tags ; recherche + filtres ; utilisables
  (cases à cocher) lors de la saisie d'une note.

### Évaluations d'un module `/modules/[id]/assessments`

- En-tête : compteur **« X/Y notes requises »** (Y = palier YNOV selon les heures ; X = nombre
  d'évaluations ayant au moins une note saisie, ventilé groupe/individuelle) + ce qui manque.
- Liste (titre, groupe, type de note, date, notée / à noter) et tableau des **moyennes
  pondérées** par étudiant·e (note de groupe ×1, individuelle ×3, `weightedAverage`).
- Création : titre, sujet, type, date, durée, coefficient, **groupe** (obligatoire), grille
  (optionnelle), case « note de groupe ».

### Saisie `/modules/[id]/assessments/[assessmentId]`

- Note de groupe → un formulaire pour le groupe. Note individuelle → un formulaire par membre.
- Avec grille : un champ par critère (max = points du critère), total calculé ; sans grille :
  note directe. Appréciation libre + commentaires prédéfinis. Enregistrement = upsert.

### Règles

- Une « note » au sens YNOV = une **évaluation** (une évaluation individuelle produit une ligne
  `grade` par étudiant·e mais ne compte que pour 1 note).
- `grade` cible soit un·e étudiant·e soit un groupe (contrainte CHECK en base).

## Trame pédagogique (E6)

- Section « Trame pédagogique » de `/modules/[id]` : badge d'échéance (E3) + boutons
  **Générer / Régénérer la trame**, **Télécharger le PDF**, **Marquer comme envoyée**,
  **Marquer comme validée**.
- Générer = instantané figé (`pedagogical_outline.content`, construit par la fonction pure
  `buildOutlineContent`) ; régénérer rafraîchit le contenu sans toucher au statut d'envoi.
- PDF « PROGRESSION PÉDAGOGIQUE » : formateur·rice, matière, YCODE, niveau, école, année,
  heures, **date de dernière MAJ**, puis par séance : titre, modalité, date, date de dernière
  MAJ du contenu, objectifs, modalités d'animation/d'évaluation, ressources, matériel.
- « Marquer comme envoyée » enregistre la date et fait passer `iceberg_state` à
  `outline_sent` (jamais de retour en arrière) ; l'alerte J-15/J-7 disparaît.
- Nom du/de la formateur·rice = `teacher_profile.legal_name` (écran Réglages à venir).

## Résultats PDF + e-mail (E6)

- Sur la page d'une évaluation (dès qu'une note existe) : **Exporter les résultats (PDF)** et
  **Envoyer par e-mail**.
- Une fiche par note : titre, module, sujet, date, destinataire(s), détail par critère
  (points / max), note totale, appréciation, commentaires prédéfinis cochés. Note de groupe :
  une seule fiche adressée à tous les membres.
- E-mail : Resend, sujet « Vos résultats — <évaluation> », PDF en pièce jointe. Les étudiant·es
  sans e-mail sont signalé·es. Sans `RESEND_API_KEY`/`RESEND_FROM` : message
  « Envoi d'e-mails non configuré ».

## Réglages (E6)

- `/settings` : **profil de prestataire** (nom/raison sociale, adresse, SIRET 14 chiffres,
  n° TVA, TVA non applicable art. 293 B, tarif horaire, e-mail, téléphone, RIB) — un seul profil,
  créé au premier enregistrement — et **écoles** (nom, SIRET, adresse, e-mail de facturation,
  identifiant Plateforme Agréée) avec ajout / modification / suppression.
- Ces données alimentent la trame (nom du/de la formateur·rice) et, en E7, les factures.
