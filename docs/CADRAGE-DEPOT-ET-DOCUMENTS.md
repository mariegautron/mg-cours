# Cadrage technique — documents joints et dépôt des rendus (à valider avant tout code)

> Statut : cadrage seul, aucune fonctionnalité codée. La spec `spec-depot-rendus-et-documents.md` et sa
> section « Décisions de Marie » n'étaient pas dans les fichiers du dépôt à la rédaction : les cinq choix
> déjà tranchés sont donc à reporter ici avant validation (voir « Questions »).

## 1. Existant réutilisé
- `submission_item` (migration 20261024) : une ligne = un fichier ou un lien, rattachée à une évaluation et à
  une personne (`student_id`) ou un groupe (`group_id`), avec `kind`, `storage_path`, `file_name`, `mime`,
  `size_bytes` et **`added_by` ('teacher' | 'student')**. Le dépôt étudiant·e s'y branche sans nouvelle table
  de rendus : « Rendus déposés » et l'ouverture des rendus depuis la copie à corriger lisent déjà cette table.
- `project_submission` (réception par groupe, date `received_on`) reste le suivi de Marie ; un dépôt étudiant·e
  ne l'écrase pas.
- Bucket privé `resource-files` pour les fichiers de fiches ; un bucket distinct `submissions` pour les rendus.
- Espace : onglet « Évaluations », carte « Prochain rendu », « Mettre à jour les cours publiés ».

## 2. Modèle de données
Étape 1 — documents et templates
- `resource.files` porte déjà les fichiers d'une fiche (téléchargement existant dans l'espace). Ajouts :
  `evaluation_document` (évaluation, chemin Storage, nom, mime, taille, `published_at` null = privé).
- Un document d'évaluation n'entre dans l'instantané qu'une fois publié ; une fiche « Pour toi seule » garde
  ses documents hors instantané (même garde `studentFacing()` que les fiches).
Étapes 2-3 — dépôts
- Pas de nouvelle table de rendus : on étend `submission_item` avec `submitted_at timestamptz` (heure serveur),
  `batch_id uuid` (un dépôt = un lot de fichiers/liens, base de l'accusé de réception), `replaced_at`
  (remplacement conservé, jamais supprimé), `late_minutes int` calculé côté serveur.
- Individuel : `student_id` renseigné. Groupe : `group_id` renseigné, un seul dépôt actif par groupe
  (index unique partiel sur `(assessment_id, group_id) where replaced_at is null` côté lot).
Étape 4 — ZIP, rappels, notification : lecture seule sur ces tables, aucune écriture nouvelle.

## 3. Accès côté étudiant·e (sans compte)
- Même modèle que `mg_student_view` : fonctions SQL `security definer` appelées avec le **haché** du jeton
  d'espace. Nouvelles fonctions : `mg_student_submission_list`, `mg_student_submit_begin` (réserve le lot et
  renvoie des URL d'envoi signées courtes), `mg_student_submit_commit` (vérifie les fichiers présents, fixe
  `submitted_at` serveur, calcule le retard).
- Contrôles dans la fonction : lien d'espace non révoqué, la personne est dans le groupe visé, l'évaluation
  est publiée dans l'espace. Le lien de la classe (`/module/...`) n'appelle aucune de ces fonctions.
- Aucune table n'est ouverte à `anon` ; aucun jeton ni adresse de fichier durable dans les pages ou journaux.

## 4. Stockage
- Bucket privé `submissions`, chemin `<owner>/<évaluation>/<lot>/<fichier nettoyé>`.
- Envoi par URL signée à usage unique (durée courte, 15 min) ; téléchargement par Marie par URL signée de
  quelques minutes. Taille maximale 50 Mo par fichier ; types acceptés listés par l'évaluation (défaut :
  pdf, zip, office, images, texte, code).
- Nom de fichier nettoyé, type vérifié côté serveur à la validation, pas seulement à l'envoi.

## 5. Écrans
Marie : évaluation → « Rendus déposés » (statut déposé / en retard (2 h) / manquant, remplacements visibles),
« Où rendre » et « Quand » réutilisés, ajout manuel conservé ; fiche/évaluation → bloc « Documents joints ».
Espace : onglet Évaluations → « Déposer mon rendu » (fichiers et/ou lien), progression, accusé de réception
(date, heure de Paris, liste des fichiers), reprise après coupure ; documents joints à côté du dépôt.

## 6. Retards
Seulement signalés : `late_minutes` > 0 affiché à Marie (« Rendu en retard (2 h) ») et à l'étudiant·e sans
pénalité ; aucun lien avec la note.

## 7. Risques et parades
- Fichiers lourds sur téléphone : envoi fichier par fichier, barre de progression, relance d'un seul fichier.
- Coupure réseau : le lot reste « en cours » ; `commit` refuse un lot incomplet ; reprise possible tant que
  l'URL signée n'a pas expiré, sinon nouvelle réservation.
- Deux membres d'un groupe qui déposent en même temps : un lot actif par groupe ; le second dépôt remplace le
  premier (l'ancien est conservé, marqué remplacé) et les deux sont prévenus.
- Fuite de fichiers : bucket privé, URL signées courtes, contrôle d'appartenance dans les fonctions SQL.
- Migration : toute la base de production n'est touchée que par migration relue, jamais appliquée par moi.

## 8. Ordre de livraison
(1) documents et templates ; (2) dépôt individuel ; (3) rendus de groupe et retards ; (4) ZIP, rappels,
notification.

## Questions pour Marie / à confirmer avant de coder
- Reporter ici les cinq décisions de la section « Décisions de Marie » (non disponibles pour ce cadrage).
- Un dépôt remplacé garde-t-il l'ancienne version visible pour Marie ? (proposé : oui)
- Types de fichiers acceptés par défaut, et taille maximale confirmée à 50 Mo.
