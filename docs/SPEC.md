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
- **Trombinoscope (US-66)** : `student.photo_path`, bucket privé `student-photos` (2 Mo, JPEG / PNG /
  WebP ; type vérifié par les premiers octets, pas d'SVG). Ajout, remplacement et suppression sur la
  fiche étudiant·e ; import d'un **zip nommé par numéro étudiant** sur `/students/photos` (max
  30 Mo / 500 fichiers ; rapport : ajoutées, sans numéro correspondant, numéros ambigus, refusées).
  Affichage sur la liste, la fiche et le carnet (observations) ; texte alternatif = le nom, initiales
  sans photo. Les images passent par `/api/students/[id]/photo` (session requise, redirection vers un
  lien signé de 60 s) : aucun lien signé dans le HTML, **jamais dans les exports, PDF, e-mails ou
  présentations**. Logique pure : `src/lib/students/photo.ts` ; écritures :
  `src/app/(app)/students/photo-actions.ts`. Migration `20261008000000_student_photo.sql`.
- **Import vers les groupes du module (US-77)** : sur `/students/import`, bloc « Groupes d'un module
  (facultatif) » : choix du module, sens de la colonne « groupe » (**la promotion**, comme avant, ou
  **un groupe du module**, créé s'il n'existe pas, reconnu sans casse ni accents), et « Ajouter tout
  le monde au groupe X » (créé au besoin). L'aperçu annonce « 3 groupes à créer (…), 1 existant
  (…) ; N appartenances » ; l'import est recalculé côté serveur (jamais confiance au client).
  Groupes créés de type TP. En mode groupe du module, la colonne n'écrit aucune promotion. Page du
  groupe : ajout de membres **en masse** (recherche nom / prénom / e-mail / numéro, « Tout
  sélectionner » sur les résultats, « Ajouter la sélection (n) »). Logique pure :
  `src/lib/students/module-groups.ts` ; écritures : `students/actions.ts`, `groups/actions.ts`
  (`addMembers`).
- **Où j'en suis (E18, US-102)** : section « Où j'en suis » sur la fiche module (sous les badges) :
  parcours en 10 étapes (fiche et attendus → rapprocher → séances → prévoir les évaluations et le fil rouge → générer la progression → l'envoyer
  → faire cours → évaluer → documents administratifs → facturer), calculé par la fonction pure
  `moduleSteps(ctx)` (`src/lib/ynov/module-steps.ts`). Chaque étape : état écrit en texte (Fait /
  À faire / En cours / En attente), détail chiffré (« 6 attendus », « 3/6 faites »…) et un lien
  d'action. La première étape non terminée est mise en avant (bouton primaire, `aria-current="step"`).
  Souple : progression envoyée ou déposée = préparation validée ; facture émise = étapes 1 à 8
  validées ; module archivé = pas de parcours. « Faites » = séances clôturées faite / partielle
  au carnet. Le badge « Prochaine étape » de l'en-tête reprend la même valeur. Composant :
  `module-journey.tsx` ; couverture : `coverage-queries.ts`. `/billing` garde `nextStep()` ci-dessous.
- **Prochaine étape (US-72)** : `/billing` utilise `nextStep()` ; sur la fiche module, le badge vient
  désormais de `moduleSteps()` (voir ci-dessus). Historique : le badge d'état iceberg de la fiche module est remplacé par
  « Prochaine étape : … », calculée par `nextStep()` (`src/lib/ynov/next-step.ts`) depuis les
  blocages réels (`invoiceBlockers`, `missingInvoiceData`) et le statut de la facture :
  envoyer la progression pédagogique → saisir les notes manquantes (x/y) → cocher le document
  administratif « … » → compléter les informations de facturation → générer la facture → envoyer
  la facture → suivre le paiement → « Facture payée ». `/billing` affiche, pour chaque module, la
  prochaine étape et la liste des raisons du blocage, sans ouvrir le module. L'état iceberg reste
  en base (il pilote J-15 et la progression envoyée) mais n'est plus affiché.
- **Importer des séances d'un autre module (US-58)** : bouton « Depuis un autre module » de
  l'onglet Séances → `/modules/[id]/import-courses` : choix du module source (actifs et archivés,
  avec leur nombre de séances), séances à cocher (« Tout cocher »), aperçu en direct (« 3 séances
  seront ajoutées à la suite des 4 existantes (séances 5 à 7) »). **Repris** : titre, modalité,
  objectifs, notes (animation, évaluation, matériel) et liens vers les ressources (mêmes rôles).
  **Non repris** : dates, horaires, statut de préparation (la copie repart « À préparer »),
  clôture de séance, carnet et observations. Logique pure : `src/lib/modules/course-import.ts` ;
  écriture : `src/app/(app)/modules/[id]/import-courses/actions.ts`.
- **Ordre des séances (US-61)** : onglet Séances, boutons « Monter » / « Descendre » sur chaque
  séance (accessibles au clavier, désactivés en bout de liste, le focus suit la séance déplacée,
  annonce « … est maintenant la séance 2 sur 5 »). Les positions sont renumérotées de 1 à N sans
  trou ; une nouvelle séance arrive en dernier ; le champ « Position » a disparu du formulaire.
  Logique pure : `src/lib/modules/reorder.ts` ; écriture : `moveCourse` dans
  `src/app/(app)/modules/[id]/courses/actions.ts`.
- **Recherche dans les ressources (US-56)** : `/resources`, le sélecteur de séance (US-62) et le
  rapprochement (US-54) cherchent dans le titre, la description, les tags et le **contenu Markdown**,
  sans casse ni accents ; tous les mots saisis doivent apparaître (dans n'importe quel champ). Un
  **extrait** (« Contenu : …**mot**… », balise `mark`) montre où le mot a été trouvé quand ce n'est
  pas le titre. Logique pure : `src/lib/resources/search.ts` ; le filtrage se fait côté serveur en
  TypeScript (Postgres ne replie pas les accents), le sélecteur reçoit le contenu tronqué à 20 000
  caractères par ressource.
- **Liaison des ressources d'une séance (US-62)** : dans le formulaire de séance, recherche par titre
  (sans casse ni accents), filtres Type, Matière et « Retenues du module », groupement par type
  (groupe « Retenues du module » en tête), compteur de ressources affichées / liées, création
  d'une ressource sur place (titre + type, créée « À construire »). La sélection survit au
  filtrage ; la première ressource liée est la principale. Garde anti-perte (`beforeunload` et
  confirmation sur « Annuler »). Composant : `src/components/modules/resource-picker.tsx`.
- **Attendus de l'école (US-53)** : section « Attendus de l'école » en tête de l'onglet Progression
  (résumé, accès) et écran `/modules/[id]/expectations`. Lecture du **PDF déposé** (« Attendus de
  l'école », lien « Ouvrir le PDF d'origine ») ou d'un **texte collé** (une ligne = un attendu) ;
  aperçu entièrement modifiable (objectifs, unités avec modalité FFP/TDP et heures, ajout /
  suppression) avant « Enregistrer ». Une relecture garde l'identité des attendus identiques. Les
  unités sont des **repères indicatifs** : aucune alerte si elles s'écartent de la progression,
  seul le total d'heures du module est contraignant. Option « Proposer un squelette de séances
  depuis les unités » (séances vides à la suite des existantes, renommables). Logique pure :
  `src/lib/modules/expectations.ts` ; écritures : `src/app/(app)/modules/[id]/expectations/actions.ts`.
  **Fiche importée à la création (E18, US-101)** : le PDF déposé sur « Préremplir depuis la fiche
  pédagogique » est conservé avec le module (document « Attendus de l'école ») et ses objectifs /
  unités sont enregistrés à la création (`importFicheForModule`, `src/lib/modules/fiche-document.ts`,
  chemins et messages purs dans `fiche-import.ts`). Sans objectifs reconnus, pas de repli « une ligne =
  un attendu » (il enregistrerait l'en-tête) : la fiche module affiche « attendus à relire » avec un
  lien vers l'écran de lecture. Redirection `?fiche=read|review|failed`.
- **Rapprochement (US-54)** : `/modules/[id]/matching` (bouton « Rapprocher avec les ressources » de
  la section Attendus). Pour chaque attendu, jusqu'à 5 ressources dont les **tags, le titre, la
  description ou le contenu** partagent ses mots-clés (sans IA : casse, accents et mots vides
  ignorés, pluriels simples), avec type, mots communs et modules où elles servent déjà.
  « Retenir » (→ ressources retenues) ; « À construire » crée une ressource « à construire » d'après
  l'attendu et la retient ; « Couvert par la séance » (cases à cocher). États : **Couvert** (séance
  ou ressource prête retenue), **À construire**, **Sans ressource**. Bilan « 4 couverts, 2 à
  construire » et liste des non couverts. Logique pure : `src/lib/modules/matching.ts`.
- **Ressources retenues (US-55)** : « Ajouter au module… » (liste des modules actifs) sur chaque
  carte de `/resources` et sur la fiche ressource ; section « Ressources retenues » en tête de
  l'onglet Séances (lien, badges, « Retirer ») ; dans le formulaire de séance, groupe « Retenues du
  module » en premier. Dupliquer un module reprend ses ressources retenues (et les horaires des
  séances). Écritures : `src/app/(app)/modules/[id]/retained/actions.ts`.
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
  … » + « Restaurer le module » ; **onglets** (Progression · Séances · Groupes et évaluations ·
  Administratif, `ModuleTabs`). Motif ARIA tabs (Radix : flèches, Début/Fin, tabindex,
  `aria-selected`, `aria-controls`). L'onglet actif suit l'ancre de l'URL (`#courses` → Séances,
  `#billing` / `#documents` → Administratif, `#groups` / `#assessments` → Groupes et évaluations, avec
  défilement jusqu'à la section) et l'ancre suit l'onglet choisi (rechargement, lien partagé).
  Table des ancres : `src/lib/modules/tabs.ts`. Après création ou modification d'une séance, retour
  sur `#courses`.
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
  démonstration / cours appliqué), date, préparation, objectifs pédagogiques (une ligne par
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

### Vue présentatrice (US-64) — `/present/modules/[id]/courses/[courseId]/presenter`

- Bouton « Vue présentatrice » de la fenêtre projetée : ouvre une seconde fenêtre (même origine,
  même navigateur), synchronisée par `BroadcastChannel` (`mg-present:{courseId}`). Seuls des
  **indices de diapositive** circulent (`state` / `go` / `hello`, validés par `parseSyncMessage`,
  `src/lib/present/sync.ts`) : jamais de contenu, jamais de donnée du carnet.
- La présentatrice montre la diapositive courante et la suivante, les **notes de séance**
  (modalités d'animation et d'évaluation, matériel), les ressources **« Enseignante uniquement »**
  (corrigés, jamais projetées), l'**heure** (Paris) et le **temps restant** jusqu'à l'heure de fin
  (US-60, le jour de la séance). Elle pilote la fenêtre projetée (Précédente / Suivante, ← → Début
  Fin) et reprend là où celle-ci en est.
- Garde-fou : le déroulé projeté (`buildCourseDeck`) ne reçoit que des ressources filtrées par
  `studentFacing()` (étudiant·es et prêtes) ; testé dans `src/lib/notebook/privacy.test.ts`.

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

### Reprise à la séance suivante (US-68)

- La consigne « À faire pour la prochaine fois » saisie à la clôture d'une séance devient la
  diapositive **« Pour aujourd'hui, vous deviez… »** de la séance suivante (après l'ouverture,
  aussi dans la vue présentatrice). Une ligne = un point (`src/lib/present/reprise.ts`).
- **Garde-fou** : `next_time` n'est lu que par ce fichier — ni PDF, ni e-mail, ni autre page ;
  les points reportés, le retour d'expérience et le statut de clôture ne sortent jamais
  (`src/lib/notebook/privacy.test.ts`).
- **Vue privée** (carnet) : bloc « Reprise de la séance précédente » avec les points non traités,
  ce qui était demandé pour aujourd'hui et le retour d'expérience de la séance précédente.
- **Duplication d'un module** : les retours d'expérience de l'année sont affichés à relire dans la
  zone « Dupliquer » (onglet Administratif) ; ils ne sont pas copiés dans le nouveau module.

## Étudiants + Groupes (E4)

### Liste `/students`

- Cartes : prénom + nom, e-mail, promotion (celle de l'année filtrée, sinon la plus récente avec
  son année). Recherche plein texte (nom/prénom/e-mail), filtres **année scolaire** (US-80b),
  promotion (celles de l'année choisie) et **module** (via l'appartenance aux groupes du module).

### Création `/students/new` · Édition `/students/[id]/edit`

- Champs : prénom, nom (obligatoires), e-mail (optionnel, unique), numéro étudiant,
  **année scolaire + promotion/groupe** (US-80b : la promotion est enregistrée pour l'année
  choisie dans `student_year`, sans toucher aux autres années ; le formulaire recharge la
  promotion de l'année sélectionnée), notes personnelles.

### Détail `/students/[id]`

- Coordonnées, groupes auxquels iel appartient (tous modules confondus, lien vers chacun),
  notes personnelles, suppression (confirmation).
- **Promotions (US-80b)** : liste des promotions par année scolaire (la plus récente en premier),
  badge « Promotion · année » sous le nom, et la promotion de l'année rappelée dans le sous-titre
  « Année 2025-26 · M1 Dev » des groupes. Logique pure : `src/lib/students/years.ts`.
- **Groupes par année scolaire (US-80a)** : un sous-titre « Année 2025-26 » par année (la plus
  récente en premier, « Sans module » à la fin) ; chaque groupe s'affiche « Groupe · Module ·
  2025-26 », trié par module puis par nom de groupe. L'année vient de `module.year` via le
  groupe (pas de migration) ; logique pure `groupsBySchoolYear` (`src/lib/students/groups.ts`).

### Import `/students/import`

- Étape 1 : dépôt d'un fichier **CSV ou XLSX** (zone de dépôt, analyse dès la sélection), colonnes reconnues par alias tolérant aux
  accents/casse (nom, prénom, email, numéro étudiant, groupe ou promotion) et **année scolaire**
  à choisir (par défaut l'année en cours) → aperçu ligne par ligne (à importer / déjà en base, à
  inscrire / déjà inscrit·e / en erreur), **rien n'est écrit à cette étape**.
- Étape 2 : confirmation → crée les nouvelles personnes (déduplication par e-mail, fichier et base)
  et **inscrit à l'année choisie celles qui sont déjà en base** (US-80b : leur promotion de cette
  année est ajoutée ou mise à jour, jamais effacée par une cellule vide ; leur fiche et leurs
  autres années ne changent pas).
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
- **Paliers par critère (US-81)** : chaque critère peut avoir ses propres paliers (points +
  description, de 1 à 20, ex. 6/4/2/0 ou 2/1/0), ajoutés ou supprimés dans l'éditeur (focus et
  annonce vocale gérés). Le barème du critère est alors le palier le plus haut (champ « Points » en
  lecture seule). Sans palier, la saisie numérique libre reste inchangée. Les paliers se
  réécrivent à chaque enregistrement : `grade.scores` stocke des points, jamais un identifiant de
  palier, donc aucune saisie n'est perdue. Descriptions visibles sur `/assessments/grids`.
  Logique pure : `src/lib/assessments/levels.ts` ; e2e : `e2e/grid-levels.spec.ts`.
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

- **Absences et pondération individuelle (US-87)** : chaque copie individuelle a un bloc « Présence » :
  **présent·e**, **absent·e non prévenu·e** (note **0 automatique**, règle de l'école) ou **absent·e
  excusé·e** (pas de note, **hors moyenne** tant qu'un rattrapage ne la remplace pas ; rattrapage :
  US-96, lot C). Une copie absente n'affiche plus les critères (saisie conservée) et compte comme
  traitée. **Note de groupe** : un bloc « Membres du groupe » liste chaque membre avec sa présence, une
  **pondération en %** (multiplicateur de la note du groupe, plafonné au barème) et sa
  **justification, obligatoire dès que la pondération diffère de 100 %** (message nommant l'étudiant·e) ;
  la note du groupe n'est jamais modifiée. Ces ajustements sont dans `group_grade_member` (une ligne par
  membre concerné). Effets : moyennes pondérées (absent·e non prévenu·e = 0 à ×1 pour une note de
  groupe, excusé·e ignoré·e, pondéré·e = note du groupe × facteur) ; le compteur de notes reste « une
  évaluation = une note » ; PDF de résultats : une fiche commune pour les membres sans ajustement, une
  fiche par membre pondéré (« Pondération individuelle : 80 % de la note du groupe » + justification) ou
  absent·e non prévenu·e (« la note est de 0 »), aucune fiche pour un·e excusé·e. Logique pure :
  `src/lib/assessments/attendance.ts` ; e2e : `e2e/attendance.spec.ts`.
- **Correction sans perte, en une page (US-86)** : la page de saisie est une session (`GradingSession`)
  qui regroupe toutes les copies. En tête (collant) : avancement **« 12/30 corrigées »** mis à jour à
  la frappe (une copie est corrigée dès qu'un critère est noté, ou si tous les critères sont validés
  d'office ; un simple commentaire ne compte pas), nombre de copies à enregistrer, **« Enregistrer
  tout »**, bascule **« Une copie à la fois » / « Un critère pour toute la classe »** (chaque copie
  n'affiche alors que le critère choisi ; le reste de la saisie est conservé et renvoyé), liste de
  liens vers les copies. Chaque copie s'**enregistre seule** 1,5 s après la dernière modification
  (`AUTOSAVE_DELAY_MS`), indique « Modifications non enregistrées » puis « Note enregistrée. », et offre
  « Copie précédente / suivante » (le focus passe au titre de l'autre copie). Tant qu'une copie est à
  enregistrer, quitter ou recharger la page avertit (`useUnsavedChangesGuard`). Une copie sans aucun
  critère noté est enregistrée **sans note** (`grade.value` null) : jamais un faux 0 qui fausserait les
  moyennes (`hasScoredInput`). Les **observations de cours** (carnet, US-65) se consultent sous chaque
  copie (« Observations de cours (n) », celles de tous les membres pour une note de groupe) ; elles
  ne sortent jamais de l'application (PDF et e-mail ne les lisent pas : `privacy.test.ts`). Logique pure :
  `src/lib/assessments/session.ts` ; e2e : `e2e/grading-session.spec.ts`.
- **Commentaire structuré (US-85)** : sous chaque critère, une zone « Commentaire — {critère} » (avec ses
  phrases repliées, limitées à ce critère ; « Insérer dans le commentaire » y place la description du
  palier choisi), puis un bloc « Bilan » : « Points forts » (phrases positives), « Progrès » (conseils et
  points à travailler) et « Commentaire libre ». Stockage : `grade.criterion_comments` (jsonb
  `{critère: texte}`), `strengths`, `progress`, `feedback`. Le PDF de résultats (et donc l'e-mail, qui
  joint ce PDF) reprend la structure : pour chaque critère le **palier obtenu** (description) et le
  **commentaire**, puis Points forts, Progrès, Commentaire ; une saisie hors paliers n'affiche pas de
  palier. **Note de groupe** : une seule fiche, identique pour tous les membres du groupe (destinataires
  = les membres). Logique pure : `src/lib/assessments/feedback.ts` (`readFeedback`) et
  `buildResultSheets` ; e2e : `e2e/grade-feedback.spec.ts` (individuelle et groupe).
- **Phrases réutilisables (US-84)** : sous l'appréciation, « Phrases réutilisables » liste les phrases
  enregistrées (les plus utilisées d'abord ; à usage égal, celles de la matière du module, puis la plus
  récente) avec un filtre par critère (Toutes / Générales / un critère). Un clic **insère** la phrase au
  curseur (à la fin, sur une nouvelle ligne, si la zone n'a pas été utilisée) : le texte est **copié**,
  donc modifier ou supprimer la phrase ne change jamais un commentaire déjà écrit. « Enregistrer la
  sélection comme phrase » (ou tout le commentaire s'il n'y a pas de sélection) ouvre un court
  formulaire : texte, critère, matière (nom du module proposé), type. Les usages sont comptés côté
  serveur (`recordPhraseUse`). La bibliothèque `/assessments/comments` affiche critère, matière et
  usage, et édite la matière. Les anciennes sélections par identifiant restent cochées (décochables)
  sur les notes qui en ont. Logique pure : `src/lib/assessments/phrases.ts` ; e2e :
  `e2e/phrases.spec.ts`.
- **Noter par palier (US-83)** : un critère à paliers se note avec de vrais **boutons radio** (un par
  palier, « 6 pt — description », plus « Pas encore noté »), regroupés dans un `fieldset` dont la légende
  est le critère : flèches du clavier natives, points et total mis à jour à chaque choix. Le palier
  choisi propose « Insérer dans l'appréciation » : « Critère — description » est ajouté à la fin de
  l'appréciation sans rien écraser (annonce vocale). Des points enregistrés qui ne correspondent (plus)
  à aucun palier restent proposés (« saisie précédente, hors des paliers actuels ») : enregistrer ne
  les efface jamais. Sans palier : champ numérique. Logique pure : `findLevel`, `levelCommentBase`,
  `appendComment` (`src/lib/assessments/levels.ts`) ; e2e : `e2e/grade-levels.spec.ts`.
- **Axes, références, bonus, validé d'office (US-82)** : l'éditeur de grille range les critères dans
  des axes (nom, ordre, rattachement par liste déroulante), donne une référence libre (ex. « RGAA
  1.3.1 ») et une case « Bonus hors barème » (jamais compté dans le barème). Le formulaire
  d'évaluation propose « Critères validés d'office pour cette évaluation » (par évaluation, pas par
  grille : la grille se réutilise d'une phase à l'autre). À la saisie, les critères sont rangés par axe
  avec sous-total en direct, un critère validé d'office s'affiche « Validé d'office : 8 / 8 » sans champ,
  et le total se recalcule à chaque frappe. Le PDF de résultats reprend axes, sous-totaux, références,
  bonus et « validé d'office ». Logique pure : `src/lib/assessments/scoring.ts`
  (`computeTotals`, `groupByAxis`, `readScores`) ; e2e : `e2e/grid-axes.spec.ts`.
- **Plafond (décision de Marie)** : le total, bonus inclus, est ramené sur le barème puis plafonné à
  ce barème ; le dépassement reste affiché (« 20,5 → plafonné à 20 » en saisie et dans le PDF). Le
  bonus compense, il ne fait jamais dépasser 20 (ADR-022).

### Règles

- Une « note » au sens YNOV = une **évaluation** (une évaluation individuelle produit une ligne
  `grade` par étudiant·e mais ne compte que pour 1 note ; une évaluation sur 6 groupes aussi).
- `grade` cible soit un·e étudiant·e soit un groupe (contrainte CHECK en base).

## Sujet d'une évaluation (E15, US-90)

- Formulaire d'évaluation : groupe « Sujet fourni aux étudiant·es » — Objectif, Consigne (Markdown, champ
  `subject`), Rendu attendu, Ce qui sera évalué (Markdown), **Séance** (séances du module) et **État de
  préparation** (À construire / Prête / Fournie). Les fichiers se déposent depuis « Modifier » (section
  « Fichiers joints au sujet », composant `FileDropZone`) : PDF, Word, présentation, image, HTML, texte, ZIP,
  50 Mo max, un fichier du même nom est remplacé ; suppression avec confirmation.
- Les fichiers sont stockés dans le bucket privé `assessment-files` et servis par
  `/api/assessments/[id]/files/[name]` **en téléchargement forcé uniquement** (`Content-Disposition:
attachment`, `Content-Type: application/octet-stream`, `X-Content-Type-Options: nosniff`, CSP `sandbox`) :
  un `.html` fourni comme extrait de code ne s'exécute jamais dans l'application. Supprimer l'évaluation
  supprime ses fichiers.
- Fiche de l'évaluation : section « Sujet » (état, séance, objectif, consigne, rendu, évalué, critères de
  la grille avec leur barème, fichiers) et bouton **« Présenter le sujet »** (`/present/modules/[id]/assessments/[assessmentId]`)
  dès que l'état n'est plus « À construire » ; sinon un message explique pourquoi.
- « Faire cours » : les sujets des évaluations rattachées à la séance (état « Prête » ou « Fournie ») sont
  ajoutés au déroulé projeté et à la vue présentatrice, après les ressources. Contenu étudiant·es
  seulement : ni notes, ni carnet, ni ressources « Enseignante uniquement », ni fichiers joints.

## Grille remise aux étudiant·es (E15, US-91)

- `/assessments/grids` : bouton **« Grille pour les étudiant·es (PDF) »** sur chaque grille
  (`/api/grids/[id]/pdf`, téléchargement).
- Fiche d'une évaluation : même bouton dans la section « Sujet », affiché dès que le sujet n'est plus
  « À construire » et qu'une grille est choisie (`/api/modules/[id]/assessments/[assessmentId]/grid`, le
  serveur refuse sinon). Le PDF reprend alors le titre, le module, la date, la durée et le barème de
  l'évaluation.
- Contenu du PDF : titre, description, axes avec sous-totaux, critères (description, référence,
  paliers du plus haut au plus bas avec leur description), bonus (« jusqu'à +n », hors barème), barème
  total. Jamais de note, de commentaire, de critère « validé d'office » ni de carnet (`buildGridHandout`,
  `src/lib/assessments/grid-handout.ts`).

## Oral de fin de projet (E15, US-92) — `/modules/[id]/assessments/[assessmentId]/oral`

- Bouton **« Faire passer l'oral »** sur la fiche d'une note de groupe qui est l'oral d'un projet (ou de
  type « oral »).
- « Ordre de passage et créneaux » : rangs des groupes volontaires (1, 2, 3…), les autres sont tirés au
  sort (graine affichée, reproductible) ; **« Établir l'ordre de passage »**. Ensuite : liste ordonnée
  (badge volontaire / tirage / passé, horaires), durée par créneau (« Durée de X (min) », vide = durée de
  l'évaluation, sinon 15 min), boutons monter / descendre nommés, heure de début et durée par groupe.
  **« Refaire l'ordre »** : confirmation (`AlertDialog`), le serveur refuse sans elle ; les notes sont
  conservées.
- Passage en cours : « Passage n sur N — Groupe », thème, membres, **chronomètre** (Démarrer / Pause /
  Reprendre / Remettre à zéro ; durée du créneau ; temps lu sur l'horloge, sans dérive). `role=timer`
  silencieux ; annonces polies (5 min pour un passage ≥ 10 min, temps écoulé), **alerte à 1 minute**
  (`role=alert`, « Dernière minute. » visible, couleur + texte), pulsation seulement sous
  `prefers-reduced-motion: no-preference`.
- Grille de correction ouverte sur le groupe qui passe : mêmes composants que la correction (enregistrement
  automatique 1,5 s, « Enregistrer tout », garde anti-perte, pondération individuelle justifiée). Les
  autres groupes restent montés, masqués : rien n'est perdu en changeant de groupe. **« Groupe suivant »**
  marque le groupe passé et ouvre le suivant (« Terminer l'oral » au dernier), « Groupe précédent ».

## Suivi des rendus (E15, US-93)

- Fiche d'une évaluation rattachée à un projet : section **« Rendus — n/N rendus reçus »**, une ligne par
  groupe visé : « Reçu le (groupe) » (date, vide = rendu retiré), « Lien du rendu (groupe) » (http(s)
  seulement), bouton nommé « Enregistrer le rendu de … », lien « Ouvrir le rendu de … (nouvel onglet) ».
  Annonces `role=status` / erreurs `role=alert`. Suivi privé : jamais exporté ni projeté.

## Projet fil rouge (E15, US-88) — `/modules/[id]/project`

- Accès depuis la section « Évaluations » de la fiche module et depuis `/modules/[id]/assessments`
  (bouton « Projet fil rouge »).
- Formulaire : titre, brief et contexte client en Markdown (« Créer le projet » puis
  « Enregistrer le projet »), rendu Markdown sous le formulaire.
- « Évaluations du projet » : liste (rôle : jalon / oral / évaluation individuelle, note de groupe ou
  individuelle, date, notée / à noter) avec lien vers chaque évaluation ; les évaluations
  apparaissent aussi sur `/assessments` avec leur rôle.
- « Squelette proposé » : déduit des notes exigées (`projectSkeleton`, `src/lib/ynov/project-skeleton.ts`) —
  1 évaluation individuelle, 1 oral, un jalon par note restante ; notes de groupe remplies d'abord.
  Chaque ligne est modifiable (titre, rôle, date, note de groupe / individuelle), on peut en ajouter ou
  en retirer ; la zone `role=status` affiche « X/Y notes YNOV exigées (n de groupe, m individuelles) » et
  signale ce qui manque, ce qui dépasse ou une répartition inhabituelle. Les évaluations créées visent
  tous les groupes du module (comme une évaluation créée à la main) ; le compteur X/Y de la fiche
  module n'a rien de particulier : il compte les évaluations notées.
- « Thèmes au choix » (US-89) : éditeur de thèmes (titre, description Markdown, jusqu'à 12, ajout /
  retrait, « Enregistrer les thèmes » ; un thème retiré libère ses groupes).
- « Affectation des thèmes » : une ligne par groupe de projet du module avec sa liste « Thème de X »
  (choix des volontaires saisi par Marie, badge « volontaire » / « tirage »). « Tirer au sort les groupes
  restants (n) » affecte les groupes sans thème choisi : sans remise tant qu'un thème est libre, puis
  répartition équitable (`drawThemes`, `src/lib/projects/draw.ts`) ; la graine est affichée
  (« Dernier tirage : graine … ») et le tirage est reproductible. Un tirage existant ne se refait
  qu'après confirmation (« Refaire le tirage », `AlertDialog`) ; le serveur refuse sinon ; les volontaires
  et les thèmes choisis à la main sont conservés. Annonces dans une zone `role=status`.
- Le thème du groupe est rappelé (« Thème : … ») sur chaque copie de la page de correction et sur la
  fiche PDF de résultats (« Thème du projet : … »).
- « Supprimer le projet » (confirmation) : les évaluations et leurs notes sont conservées, détachées.

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

## Banque de questions (E16, US-94)

- `/questions` : liste filtrable (recherche plein texte sans accent ni casse, catégorie, type, tag, archivées),
  « Nouvelle question », « Importer (Moodle XML) », « Exporter (Moodle XML) » (selon les filtres).
- `/questions/[id]` : aperçu tel que l'étudiant·e le voit (groupe de champs légendé, vrais boutons radio /
  cases à cocher, aucune bonne réponse) puis corrigé réservé à Marie ; Modifier, Dupliquer, Archiver.
- `/questions/new`, `/questions/[id]/edit` : formulaire par type ; choix ajoutés / supprimés au clavier
  (annonce polie), part des points facultative par choix (vide = répartie, négatif = pénalité).
- `/questions/import` : Moodle XML en deux temps, « Vérifier le fichier » (aucune écriture : à importer,
  déjà dans la banque, non reprises avec la raison) puis « Importer ».

## QCM en ligne (E16, US-95)

- `/modules/[id]/assessments/[assessmentId]/quiz` (bouton « QCM en ligne » sur une évaluation individuelle) : créer le
  QCM, configurer (durée, fenêtre, consignes, mélange, ce que voient les étudiant·es, règles de tirage avec le nombre
  de questions disponibles et le total de points), publier / repasser en brouillon / clôturer ; « Préparer les tirages et
  les liens » (CSV autonome ou e-mail, rappel « Ce lien est personnel : ne le partage pas. ») ; suivi par copie (état,
  note, nouveau lien, révoquer, refaire le tirage, rendre la copie, rouvrir, tiers-temps, modifications tardives).
- `/…/quiz/attempts/[attemptId]` : relecture des réponses libres (points bornés au barème), corrigé de la copie.
- `/q/[token]` (public, hors garde d'authentification) : consignes → questions (`fieldset` / `legend`, clavier) →
  confirmation « Rendre ta copie ? » → résultat selon le réglage ; chrono serveur annoncé poliment à 5 min et 1 min.
