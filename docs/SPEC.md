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

## Tableau de bord (`/dashboard`)

- **Carte « Aujourd'hui » (US-63)**, sous l'accroche, affichée seulement s'il y a cours : séances
  dont `session_date` = aujourd'hui **à Paris** (`todayInParis`), modules non archivés, triées par
  heure de début (sans horaire à la fin), puis module et position (`todaySessions`,
  `src/lib/dashboard/today.ts`). Pour chacune : horaires (US-60) et module,
  titre, **Faire cours** (`/present/modules/[id]/courses/[courseId]`) et un second lien vers la
  séance côté enseignante. « Faire cours » par séance et « Présenter le module » : fiche module
  (E10).
- Accroche : « Tout est en ordre » **uniquement** si aucune progression pédagogique n'est en
  alerte ; sinon « … demande ton attention » (retard ou J-7) ou « … est à préparer » (J-15
  seulement). Mascotte en alerte dans les deux derniers cas.
- Carte « Progressions pédagogiques à envoyer » (US-74) : retard, J-7 **et J-15**, triés du plus
  pressant au moins pressant, 5 au plus (+ N autre(s)). Badges distincts, avec texte et pas
  seulement couleur : « En retard de N j » et « Urgent · J-N » (rouge), « À préparer · J-N »
  (contour). Logique pure `outlineAlerts` / `outlineAlertSummary` (`src/lib/ynov/trame.ts`).
- Cartes Modules actifs et Facturation (prêts à facturer, à envoyer, paiements attendus).

## Ressources (E2)

Support pédagogique **réutilisable** dans N modules (≈ base « Ressources » de Notion).

### Classement (spec `docs/specs/ressources-classement.md`)

- **Type** (`kind`) : Cours · Atelier / exercice · Projet · Modèle · Corrigé · Banque de questions
  · Référence externe · Notes enseignante. Obligatoire dans le formulaire ; vide pour
  l'existant (« Type à définir », groupe « Non classées »).
- **Matière** (`category`) : suggestions (matières déjà utilisées + Accessibilité, Qualité web,
  Numérique responsable, Gestion de projet, Agilité), saisie libre.
- **Visibilité** (`audience`) : Étudiant·es (défaut) / **Enseignante uniquement** — badge texte
  avec icône cadenas partout où la ressource apparaît. Corrigé, banque de questions et notes
  pré-sélectionnent « Enseignante uniquement ».
- **Statut** (`status`, US-57) : Prête (défaut) / **À construire** avec une note d'intention.
  Création rapide sur `/resources` (titre + note), filtre « Statut », compteur « N ressources à
  construire » sur l'onglet Séances du module. Une ressource « À construire » n'est jamais
  projetée ni exportée (`studentFacing()` exige `status = ready`).
- **Garde-fou** : `studentFacing()` (`src/lib/resources/kind.ts`) filtre toute sortie vers les
  étudiant·es — mode présentation, export PDF des cours (`toExportCourses`), futurs liens élèves /
  QCM. Les e-mails existants (résultats, facture) n'embarquent aucune ressource. La progression
  (destinée à l'école) liste toujours tous les titres.

### Liste `/resources`

- Cartes : titre, description (2 lignes), type, badge « Enseignante uniquement », matière +
  tags, « Utilisée dans N modules ».
- Recherche plein texte (titre + description), filtres **Type** (dont « Non classées »),
  **Matière**, **Visibilité**, tag, archivées ; **regroupement** par type (défaut), par matière
  ou aucun (`?group=`), sections `<h2>` avec effectif. Compteur de résultats (`role="status"`).
- État vide → invite à créer.

### Création `/resources/new` · Édition `/resources/[id]/edit`

- Champs : **titre** et **type** (obligatoires), matière (suggestions), visibilité (2 cartes
  radio avec explication), description, lien (URL validée), tags (virgules → tableau), contenu
  Markdown avec onglets **Écrire / Aperçu** (même rendu que la fiche). Barre d'enregistrement
  collante ; alerte navigateur si on quitte avec des modifications.
- Validation zod côté serveur, erreurs par champ reliées (`aria-describedby` + `role="alert"`).

### Détail `/resources/[id]`

- En-tête : titre, type, visibilité, matière, description ; actions **Présenter** (masqué si
  « Enseignante uniquement »), Modifier, Historique.
- Contenu au centre (largeur de lecture) ; colonne latérale (écran large, collante) :
  **sommaire** des titres `#`/`##` (ancres), visibilité expliquée, tags, utilisation, fichiers,
  actions. Lien externe au-dessus du contenu.
- **Utilisation** : liste des modules (nom + année) où la ressource est employée, triés par
  année décroissante ; lien vers chaque module.
- **Fichiers (n)** : cartes fichier (type · taille) + Aperçu (PDF, image) / Télécharger /
  Supprimer (confirmation) ; zone de dépôt partagée (`FileDropZone`) ; dépôt direct navigateur → Storage
  (bucket privé `resource-files`, `<owner_id>/<resource_id>/…`, 50 Mo, PDF / Word / présentation /
  PNG-JPEG-GIF-WebP, pas de SVG). Un fichier du même nom remplace l'ancien. Pour une image :
  « Copier la syntaxe » (`![nom](nom.png)`).
- Contenu Markdown rendu — un seul parseur partagé web/PDF (`src/lib/pdf/markdown.ts`) : titres
  (`#` à `######`), listes imbriquées (indentation variable, ordonnées/non ordonnées mélangées),
  cases à cocher `- [ ]`/`- [x]` (lecture seule, texte accessible « fait »/« à faire »), tableaux
  GFM (alignement, mise en forme dans les cellules, `<table>` accessible dans une région défilable
  au clavier côté web), séparateurs `---`, encadrés `<aside>…</aside>` (callouts Notion), citations,
  code, gras/italique/liens, `<br>`. Tout autre HTML est affiché tel quel, jamais interprété. Une
  image au chemin
  relatif (`![alt](schema.png)`, ou chemin d'export Notion `Page%20x/schema.png`) désigne le
  fichier de la ressource portant ce nom ; elle est servie par
  `GET /api/resources/[id]/files/[name]`, qui redirige vers un lien signé de 5 min
  (`?download=1` pour forcer le téléchargement).
- Actions : Modifier · Archiver / Désarchiver · Supprimer (confirmation `AlertDialog`).

### Historique `/resources/[id]/history`

- Chaque version se déplie sur son contenu **rendu** (Markdown), restaurable.

### Règles

- `resource.archived_at` : une ressource archivée reste liée à ses cours mais sort des listes
  par défaut.
- Suppression : `course_resource` en `on delete cascade` (les liens disparaissent, pas les cours).
- Fichiers joints : métadonnées dans `resource.files` (`[{ path, name, size, mime }]`), fichiers
  supprimés du stockage avec la ressource. Non versionnés par l'historique. Dans le PDF des
  cours, une image devient `[Image : alt]`.

## Modules + Cours (E3)

Un module = conteneur école/année (YCODE, heures, dates). Ses séances (`course`) sont
chacune liées à une ou plusieurs ressources réutilisables.

### Liste `/modules`

- Cartes triées par année décroissante puis nom : école · niveau · année, badges heures,
  minimum de notes, statut de la progression.
- Filtre segmenté `Actifs (n) | Archivés (n) | Tous` (`nav` + `aria-current`), dans l'URL :
  `?filter=archived` / `?filter=all` (l'ancien `?archived=1` mène à « Tous »).
- Carte archivée : fond atténué, bordure pointillée, icône archive, badge « Archivé le … » +
  heures seulement ; archivés triés du plus récemment archivé. « Tous » : intertitres
  « Actifs » / « Archivés ».
- État vide contextuel : « Aucun module actif — N modules archivés » + « Voir les archivés ».
- Archiver depuis la fiche : toast avec « Annuler » ; « Restaurer le module » pour désarchiver.

### Création `/modules/new` · Édition `/modules/[id]/edit`

- Champs : nom, école (liste `school`), niveau, année, YCODE, heures (total + FFP/TD/TP),
  dates (début, **1re séance**, fin), référence bon de commande.
- La date de 1re séance sert au calcul de l'échéance de la progression (J-15).
- **Fiche pédagogique PDF (US-79)** : préremplit nom (« Nom long » ou « Intitulé »), niveau
  (« Niveau Mastère 1 »), YCODE, année et heures. Le total est le premier volume après « Volume
  heures totales » ; FFP / TDP sont facultatifs et lus seulement s'ils correspondent aux valeurs
  (« FFP TDP / 28h 10h 18h »). Le tableau des unités pédagogiques n'est jamais lu pour les heures
  (`src/lib/modules/fiche.ts`).
- **Planning (US-59)** : à la création, tableau de créneaux (date, début, fin ; « Ajouter une
  ligne », « + 7 jours » pour dupliquer) ou collage (« 01/10/2026 10:00-12:00 », « 01/10 10h-12h »…),
  avec aperçu des séances et des lignes non reconnues. Les séances vides sont créées d'un coup
  (« Séance 1…N », « À préparer ») et la 1re séance renseigne la date de référence J-15. Même saisie
  sur un module existant : `/modules/[id]/schedule` (bouton « Depuis un planning » de l'onglet
  Séances), numérotation à la suite des séances existantes. Logique pure :
  `src/lib/modules/schedule-parser.ts` ; écriture : Server Actions `createModule` /
  `addScheduleToModule` (module contrôlé par `owner_id`).

### Détail `/modules/[id]`

Dépôts de fichiers (partout : documents du module, fichiers de ressource, fiche pédagogique,
import étudiants) : `src/components/files/` — `FileDropZone` (zone pointillés cliquable +
glisser-déposer, formats et taille affichés, envoi dès la sélection, état « en cours »
annoncé) et `FileCard` (type · taille · date + actions nommées).

- Fil d'Ariane `Modules › {nom}` (« Modules archivés » si archivé) ; bandeau « Module archivé le
  … » + « Restaurer le module » ; sous-navigation par onglets (Progression · Seances · Groupes & Evaluations · Administratif). Ordre des sections = ordre
  d'usage : Séances avant Documents.
- En-tête : école, niveau, année, YCODE ; badges heures / **minimum de notes requises**
  (`requiredNotes`, ex. 21 h → « 3 notes min. (2 groupes + 1 individuelle) ») / état iceberg.
- **Progression pédagogique** : badge d'échéance (`trameStatus`) —
  `ok` (> J-15) · `warning` (≤ J-15) · `urgent` (≤ J-7) · `overdue` (dépassée) ·
  `sent` (dès `iceberg_state ≥ outline_sent`) · `unknown` (pas de date de 1re séance).
  Génération réelle de la progression PDF : E6.
- **Séances** : liste ordonnée (titre, date, statut de préparation `prep_status` — À préparer /
  En préparation / Prête, compteur « n/N prêtes » —, modalité, objectifs, ressources liées, date
  de dernière MAJ du contenu) ; ajouter (bouton principal) / modifier / supprimer une séance
  (confirmation). État vide avec « Planifier la première séance ».
- **Évaluations** : nombre d'évaluations, nombre avec notes saisies, notes requises obtenues.
- **Documents** (attendus de l'école, progression envoyée, facture externe — aussi sur Facturation) :
  zone de dépôt en pointillés cliquable + glisser-déposer (PDF/Word/ODT, 50 Mo max, dépôt dès
  la sélection) ; une fois déposé, carte fichier (type · taille · date) avec « Aperçu » (PDF,
  `?inline=1`, nouvel onglet), « Télécharger », « Supprimer » (confirmation) ; la zone reste
  visible en version compacte « Ajouter un fichier ».
- **Documents administratifs** : 4 interrupteurs (fiche de positionnement, supports Moodle,
  sujets/grilles Moodle, notes saisies dans Hyperplanning) → `module.admin_docs`. La progression
  pédagogique n'est pas une case : elle est déduite de son dépôt en PDF ou de « Marquer comme
  envoyée » (clé historique `progression_pedagogique` conservée en base, ignorée).
- **Actions** : dupliquer vers une nouvelle année (module + séances + liens ressources,
  dates et statut remis à zéro) · supprimer (confirmation).

### Séance `/modules/[id]/courses/new` · `/modules/[id]/courses/[courseId]/edit`

- Champs : titre, modalité (cours théorique / atelier-TP / projet / évaluation /
  démonstration / cours appliqué), position, date, préparation, objectifs pédagogiques (une ligne par
  objectif), ressources liées (cases à cocher), modalités d'animation/d'évaluation, matériel.
- **Horaires (US-60)** : début et fin facultatifs (`start_time` / `end_time`, fin après le début,
  début obligatoire si fin). Durée par séance dans la liste ; l'onglet Séances affiche « 18 h
  planifiées / 21 h » et un avertissement « À vérifier » au-delà de 0,5 h d'écart avec le volume du
  module (seuls les créneaux complets comptent). Horaires repris dans le PDF de progression
  (`src/lib/modules/course-duration.ts`).
- Toute modification met à jour `content_last_updated_at` (repris tel quel dans la progression).

### Règles

- `required_notes` et le workflow iceberg sont des fonctions pures testées
  (`src/lib/ynov/notation.ts`, `iceberg.ts`, `trame.ts`), jamais recalculées dans l'UI.
- La duplication ne copie pas les évaluations/notes (propres à une année), seulement la
  structure pédagogique (cours + ressources liées).

## Faire cours (E10) — mode présentation

Projeté en classe depuis la session de l'enseignante (aucune route publique). Route group
`(present)` : plein écran sans menu, même contrôle d'auth que `(app)`.

### Écrans

- `/present/modules/[id]/courses/[courseId]` — **Faire cours** (bouton sur chaque séance et
  encart « Séance du jour / Prochaine séance » en tête de fiche module) : titre (module, séance N,
  date) → objectifs → « Au programme » → pour chaque ressource étudiant·es (principale d'abord) :
  intercalaire (type, titre, description) + contenu + lien + fichiers (image en grand, PDF intégré
  avec lien « Ouvrir », autres fichiers à télécharger) → « Prochaine séance : … ». Notes
  d'animation / d'évaluation jamais affichées.
- `/present/modules/[id]` — **Présenter le module** : accueil (école, niveau, année, heures,
  début) → présentation aux étudiant·es (`module.student_intro`, Markdown, saisi dans le
  formulaire module) → programme daté → objectifs (union des séances) → évaluation (titre,
  groupe/individuelle, date + minimum YNOV) → ressources étudiant·es groupées par type.
- `/present/resources/[id]` — une ressource seule ; ressource « Enseignante uniquement » →
  message, rien n'est affiché.

### Coque `PresentShell`

- **Document** (défaut, lecture continue grand format) ou **Diapositives** : découpage auto sur
  les titres `#`/`##` et les séparateurs `---` (`splitSlides`, `src/lib/present/slides.ts`).
- Clavier : ← → Espace PageUp/PageDown Début/Fin, `F` plein écran, `S` sommaire, `D`
  document/diapositives, `+`/`−` taille du texte (80 → 150 %). Boutons visibles équivalents.
- Sommaire par section, thème clair/sombre, barre de progression, « Diapositive n sur N »
  annoncé (`aria-live`), « Quitter » → fiche. Mode et taille mémorisés (`localStorage`).

## Carnet de séance (US-65 + US-67) — `/modules/[id]/courses/[courseId]/notebook`

Vue **privée**, pensée pour le téléphone ou une 2e fenêtre, **jamais projetée**. Accès : bouton
« Carnet » sur chaque séance de la fiche module, et « Carnet de séance » sur la carte
« Aujourd'hui » du tableau de bord. En-tête : module · séance N · date, avertissement « Vue
privée », lien « Ouvrir la présentation » (nouvel onglet).

- **Observations (US-65, version simple)** : étudiant·es des groupes du module (sans doublon,
  triés par nom), champ « Filtrer par nom » (prénom/nom, sans accents ni casse, nombre annoncé).
  Un appui sur un nom (`aria-expanded`) ouvre un petit formulaire : note facultative puis
  **étiquettes en boutons** (Question pertinente, Participation, Difficulté, Absent·e ou retard,
  Autre) — un appui sur l'étiquette enregistre. Retour « Observation enregistrée : Nom —
  Étiquette. » (`role=status`), le formulaire se referme et le focus revient sur le nom. Liste
  « Notées pendant cette séance (N) » (heure, nom, étiquette, texte, suppression confirmée). Le
  serveur vérifie que la séance appartient au module et l'étudiant·e à un de ses groupes.
- **Clôture (US-67, version simple)** : La séance a été… Faite / Partiellement faite / Non faite
  (radios), « Points non traités, à reporter », « À faire pour la prochaine fois », « Retour
  d'expérience (privé) » ; « Enregistrer la clôture » → « Clôture enregistrée. ». Badge de statut
  sur la liste des séances. Ne modifie pas `content_last_updated_at` ; non copié à la duplication
  d'un module.
- Fiche `/students/[id]` : **Journal d'observations** (date et heure à Paris, module · séance,
  étiquette, texte), du plus récent au plus ancien.
- **Jamais** dans les exports PDF, les e-mails ni la présentation : test
  `src/lib/notebook/privacy.test.ts` (lecture des sources d'export + builders) et e2e (HTML de
  la présentation sans aucun texte du carnet).

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
- **Groupes par année scolaire (US-80a)** : un sous-titre « Année 2025-26 » par année (la plus
  récente en premier, « Sans module » à la fin) ; chaque groupe s'affiche « Groupe · Module ·
  2025-26 », trié par module puis par nom de groupe. L'année vient de `module.year` via le
  groupe (pas de migration) ; logique pure `groupsBySchoolYear` (`src/lib/students/groups.ts`).

### Import `/students/import`

- Étape 1 : dépôt d'un fichier **CSV ou XLSX** (zone de dépôt, analyse dès la sélection), colonnes reconnues par alias tolérant aux
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

- Grille réutilisable : nom, description, éditeur de liste de critères (libellé, points,
  description repliable pour les niveaux de notation, ex. « 6 pts : excellent ») ; barème = somme
  des points ; réordonnancement par boutons (haut/bas, clavier), ajout, suppression.
- Modifier une grille **conserve l'identifiant** de chaque critère inchangé (mise à jour, pas
  recréation) : les descriptions ne sont pas perdues et le détail des notes déjà saisies
  (`grade.scores`, rangé par identifiant de critère) reste rattaché.
- Supprimer un critère déjà noté dans au moins une évaluation demande confirmation avant
  d'enregistrer (message nommant le ou les critères concernés) ; une fois confirmé, sa clé est
  retirée de `grade.scores` (la note globale `value` est conservée telle quelle, non recalculée).
- Un identifiant soumis qui n'appartient pas à cette grille (copié depuis une autre) est ignoré et
  traité comme une création.

### Commentaires prédéfinis `/assessments/comments`

- Texte, catégorie (positif / négatif / conseil), tags ; recherche + filtres ; utilisables
  (cases à cocher) lors de la saisie d'une note.

### Évaluations d'un module `/modules/[id]/assessments`

- En-tête : compteur **« X/Y notes requises »** (Y = palier YNOV selon les heures ; X = nombre
  d'évaluations ayant au moins une note saisie, ventilé groupe/individuelle) + ce qui manque.
- Liste (titre, groupes, type de note, date, notée / à noter) et tableau des **moyennes
  pondérées** par étudiant·e (note de groupe ×1, individuelle ×3, `weightedAverage`).
- Création : titre, sujet, type, date, durée, coefficient, **groupes** (cases à cocher, au moins un :
  ex. les 6 groupes de projet notés sur un même TP), grille
  (optionnelle), case « note de groupe ». Sujet = zone de texte **Markdown** (consignes
  complètes, 20 000 caractères max), rendu en section « Sujet » sur la page de l'évaluation.

### Saisie `/modules/[id]/assessments/[assessmentId]`

- Note de groupe → un formulaire par groupe visé. Note individuelle → un formulaire par membre de
  l'ensemble des groupes, rangés par groupe ; un·e étudiant·e présent·e dans plusieurs groupes n'a
  qu'un formulaire (`gradingTargets`, `src/lib/assessments/targets.ts`).
- Retirer un groupe à l'édition supprime ses notes de groupe ; les notes individuelles restent.
- Avec grille : un champ par critère (max = points du critère), total calculé, description du
  critère repliable (« Voir le barème ») quand elle existe ; sans grille : note directe.
  Appréciation libre + commentaires prédéfinis. Enregistrement = upsert.

### Règles

- Une « note » au sens YNOV = une **évaluation** (une évaluation individuelle produit une ligne
  `grade` par étudiant·e mais ne compte que pour 1 note ; une évaluation sur 6 groupes aussi).
- `grade` cible soit un·e étudiant·e soit un groupe (contrainte CHECK en base).

## Progression pédagogique (E6)

- Section « Progression pédagogique » de `/modules/[id]` : badge d'échéance (E3) + boutons
  **Générer / Régénérer la progression**, **Télécharger le PDF**, **Marquer comme envoyée**,
  **Marquer comme validée**.
- Générer = instantané figé (`pedagogical_outline.content`, construit par la fonction pure
  `buildOutlineContent`) ; régénérer rafraîchit le contenu sans toucher au statut d'envoi.
- PDF « PROGRESSION PÉDAGOGIQUE » : formateur·rice, matière, YCODE, niveau, école, année,
  heures, **date de dernière MAJ**, puis par séance : titre, modalité, date, date de dernière
  MAJ du contenu, objectifs, modalités d'animation/d'évaluation, ressources, matériel.
- « Marquer comme envoyée » enregistre la date et fait passer `iceberg_state` à
  `outline_sent` (jamais de retour en arrière) ; l'alerte J-15/J-7 disparaît.
- Nom du/de la formateur·rice = `teacher_profile.legal_name` (écran Réglages à venir).

### Cohabitation avec une progression déposée en PDF (module déjà réalisé)

Pour un module déjà réalisé, une progression déposée sur « Documents » (`module_document.kind =
outline_sent`) **fait foi** : la génération depuis les séances reste possible mais ne se présente
jamais comme la version envoyée.

- Dès qu'un document `outline_sent` existe (le plus récent), la section affiche « Progression envoyée
  (PDF déposé le jj/mm/aaaa) » avec **Télécharger** et **Voir** (aperçu, `?inline=1`) à la place du
  badge d'échéance habituel.
- Une progression générée en plus s'affiche en secondaire : « Progression générée depuis les séances le …
  (brouillon, non envoyée) ».
- Le bouton devient **« Générer une progression depuis les séances »**, avec l'aide « La progression déposée
  reste la version envoyée à l'école. » — **Marquer comme envoyée** ne s'affiche pas (une progression
  générée sans dépôt garde son bouton habituel).
- Module archivé : les boutons **Générer** et **Marquer comme envoyée** sont masqués (plus besoin
  d'une nouvelle progression pour un module passé) ; télécharger et valider restent disponibles.
- Aucun lien en base entre le document déposé et l'instantané généré (pas nécessaire à la
  cohabitation) : `depositedOutline` est calculé côté page comme le document `outline_sent` le plus
  récent du module.
- **Dépôt = envoi (US-70)** : déposer un document `outline_sent` fait avancer `iceberg_state`
  jusqu'à `outline_sent` (jamais de recul, `advanceModule` dans `src/lib/modules/advance.ts`,
  partagé avec la génération et la facturation) : la facturation n'est plus bloquée par une
  progression envoyée hors application. Supprimer le document ne fait pas reculer l'état. Migration de
  rattrapage `20260927130000_outline_upload_sent` pour les modules déjà concernés.

## Résultats PDF + e-mail (E6)

- Sur la page d'une évaluation (dès qu'une note existe) : **Exporter les résultats (PDF)** et
  **Envoyer par e-mail**.
- Une fiche par note : titre, module, date, destinataire(s), sujet (Markdown rendu), détail par critère
  (points / max), note totale, appréciation, commentaires prédéfinis cochés. Note de groupe :
  une seule fiche adressée à tous les membres.
- E-mail : Resend, sujet « Vos résultats — <évaluation> », PDF en pièce jointe. Les étudiant·es
  sans e-mail sont signalé·es. Sans `RESEND_API_KEY`/`RESEND_FROM` : message
  « Envoi d'e-mails non configuré ».
- **Envoi confirmé (US-76)** : « Envoyer par e-mail » ouvre une confirmation avec le nombre de
  destinataires (e-mails distincts, `resultsRecipients` dans `src/lib/assessments/results.ts`),
  la liste des étudiant·es sans e-mail, et « Déjà envoyés le … » si `assessment.results_sent_at`
  est renseigné (le bouton devient « Renvoyer à N destinataires »). Bouton désactivé si personne
  n'a d'e-mail. `sendResultsEmail` renseigne `results_sent_at` dès qu'au moins un e-mail part.

## Réglages (E6)

- `/settings` : **profil du prestataire** en 4 groupes (`fieldset`) — Identité (nom/raison
  sociale, adresse) · Informations administratives (SIRET 14 chiffres, NDA, TVA non applicable
  art. 293 B avec aide, n° TVA) · Coordonnées (e-mail, téléphone) · Coordonnées bancaires
  (**IBAN** validé modulo 97 + **BIC** 8/11 caractères, stockés dans `bank_details` sous la forme
  `IBAN : …\nBIC : …`) — un seul profil, créé au premier enregistrement. Bouton « Enregistrer les
  modifications » désactivé tant que rien n'a changé, puis « ✓ Modifications enregistrées »
  (`role="status"`). **Écoles** (nom, SIRET, adresse, e-mail de facturation, identifiant
  Plateforme Agréée) : cartes avec SIRET formaté, actions « Modifier » / « Supprimer »
  (confirmation) et ajout.
- Formulaire école (création / modification) : groupes « L'école » (nom\*, adresse multi-ligne)
  et « Facturation » (SIRET, identifiant PA, e-mail) avec exemples et aides reliées ; bouton
  « Créer l'école » ou « Enregistrer les modifications » ; lien « ← Réglages ». Quitter avec des
  modifications non enregistrées demande confirmation (dialogue + `beforeunload`). Retour sur
  `/settings?saved=…` avec « ✓ École « X » enregistrée. » (`role="status"`).
- Ces données alimentent la progression (nom du/de la formateur·rice) et, en E7, les factures.

## Facturation (E7)

- `/modules/[id]/billing` : **Conditions YNOV** (progression envoyée, notes X/Y) puis la **checklist
  des 4 documents administratifs, modifiable sur place** (US-71 : mêmes interrupteurs que la fiche
  module ; chaque bascule affiche « Enregistré : … » dans une zone `role=status`, ou l'erreur en
  `role=alert` ; l'action `setAdminDoc` refuse une clé inconnue) et
  **Mentions obligatoires** manquantes (avec liens vers Réglages / fiche module). Le bouton
  « Générer la facture » n'est actif que si tout est vert ; le serveur revérifie tout.
- Facture : numéro `AAAA-NNN`, échéance 30 jours fin de mois, désignation
  « Prestation d'enseignement – Module … (YCODE : …) – N heures », montants HT/TVA/TTC
  (franchise 293 B = TVA 0 % + mention), référence de bon de commande, IBAN.
- Formats : **PDF Factur-X (PDF/A-3 + XML EN 16931)** et XML seul, téléchargeables à tout moment
  (régénérés à l'identique depuis l'instantané).
- Cycle : À envoyer → (e-mail à l'école **ou** marquage manuel) Envoyée → Payée.
- **Actions sécurisées (US-73)** : « Envoyer par e-mail à l'école » ouvre une confirmation
  (`AlertDialog`) récapitulant destinataire, numéro, montant TTC et pièce jointe, avec « Aperçu du
  PDF » (`/api/invoices/[id]/pdf?inline=1`, nouvel onglet) ; le bouton de validation nomme le
  destinataire. Bouton désactivé (avec explication) sans e-mail de facturation. « Supprimer la
  facture » passe par `ConfirmDeleteButton`. « Télécharger le XML » est rangé dans le menu
  « Plus » (le PDF Factur-X contient déjà le XML).
- `/billing` : par module — facturé (n° + statut) / prêt à facturer / bloqué (nb de points).
