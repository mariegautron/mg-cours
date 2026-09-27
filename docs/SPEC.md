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
- **Fichiers** : liste (nom, taille) + Télécharger / Supprimer ; dépôt direct navigateur → Storage
  (bucket privé `resource-files`, `<owner_id>/<resource_id>/…`, 50 Mo, PDF / Word / présentation /
  PNG-JPEG-GIF-WebP, pas de SVG). Un fichier du même nom remplace l'ancien. Pour une image :
  « Copier la syntaxe » (`![nom](nom.png)`).
- Contenu Markdown rendu (titres, listes, code, citations, liens, images). Une image au chemin
  relatif (`![alt](schema.png)`, ou chemin d'export Notion `Page%20x/schema.png`) désigne le
  fichier de la ressource portant ce nom ; elle est servie par
  `GET /api/resources/[id]/files/[name]`, qui redirige vers un lien signé de 5 min
  (`?download=1` pour forcer le téléchargement).
- Actions : Modifier · Archiver / Désarchiver · Supprimer (confirmation `AlertDialog`).

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
  minimum de notes, statut de la trame.
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
- La date de 1re séance sert au calcul de l'échéance de la trame (J-15).

### Détail `/modules/[id]`

- Fil d'Ariane `Modules › {nom}` (« Modules archivés » si archivé) ; bandeau « Module archivé le
  … » + « Restaurer le module » ; sous-navigation d'ancres collante (Trame · Séances · Groupes ·
  Évaluations · Documents · Facturation · Administratif · Actions). Ordre des sections = ordre
  d'usage : Séances avant Documents.
- En-tête : école, niveau, année, YCODE ; badges heures / **minimum de notes requises**
  (`requiredNotes`, ex. 21 h → « 3 notes min. (2 groupes + 1 individuelle) ») / état iceberg.
- **Trame pédagogique** : badge d'échéance (`trameStatus`) —
  `ok` (> J-15) · `warning` (≤ J-15) · `urgent` (≤ J-7) · `overdue` (dépassée) ·
  `sent` (dès `iceberg_state ≥ outline_sent`) · `unknown` (pas de date de 1re séance).
  Génération réelle de la trame PDF : E6.
- **Séances** : liste ordonnée (titre, date, statut de préparation `prep_status` — À préparer /
  En préparation / Prête, compteur « n/N prêtes » —, modalité, objectifs, ressources liées, date
  de dernière MAJ du contenu) ; ajouter (bouton principal) / modifier / supprimer une séance
  (confirmation). État vide avec « Planifier la première séance ».
- **Évaluations** : nombre d'évaluations, nombre avec notes saisies, notes requises obtenues.
- **Documents** (attendus de l'école, trame envoyée, facture externe — aussi sur Facturation) :
  zone de dépôt en pointillés cliquable + glisser-déposer (PDF/Word/ODT, 50 Mo max, dépôt dès
  la sélection) ; une fois déposé, carte fichier (type · taille · date) avec « Aperçu » (PDF,
  `?inline=1`, nouvel onglet), « Télécharger », « Supprimer » (confirmation) et « Ajouter un
  fichier » pour déplier la zone.
- **Documents administratifs** : 4 interrupteurs (fiche de positionnement, progression
  pédagogique, supports Moodle, sujets/grilles Moodle) → `module.admin_docs`.
- **Actions** : dupliquer vers une nouvelle année (module + séances + liens ressources,
  dates et statut remis à zéro) · supprimer (confirmation).

### Séance `/modules/[id]/courses/new` · `/modules/[id]/courses/[courseId]/edit`

- Champs : titre, modalité (cours théorique / atelier-TP / projet / évaluation /
  démonstration / cours appliqué), position, date, préparation, objectifs pédagogiques (une ligne par
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

### Cohabitation avec une trame déposée en PDF (module déjà réalisé)

Pour un module déjà réalisé, une trame déposée sur « Documents » (`module_document.kind =
outline_sent`) **fait foi** : la génération depuis les séances reste possible mais ne se présente
jamais comme la version envoyée.

- Dès qu'un document `outline_sent` existe (le plus récent), la section affiche « Trame envoyée
  (PDF déposé le jj/mm/aaaa) » avec **Télécharger** et **Voir** (aperçu, `?inline=1`) à la place du
  badge d'échéance habituel.
- Une trame générée en plus s'affiche en secondaire : « Trame générée depuis les séances le …
  (brouillon, non envoyée) ».
- Le bouton devient **« Générer une trame depuis les séances »**, avec l'aide « La trame déposée
  reste la version envoyée à l'école. » — **Marquer comme envoyée** ne s'affiche pas (une trame
  générée sans dépôt garde son bouton habituel).
- Module archivé : les boutons **Générer** et **Marquer comme envoyée** sont masqués (plus besoin
  d'une nouvelle trame pour un module passé) ; télécharger et valider restent disponibles.
- Aucun lien en base entre le document déposé et l'instantané généré (pas nécessaire à la
  cohabitation) : `depositedOutline` est calculé côté page comme le document `outline_sent` le plus
  récent du module.

## Résultats PDF + e-mail (E6)

- Sur la page d'une évaluation (dès qu'une note existe) : **Exporter les résultats (PDF)** et
  **Envoyer par e-mail**.
- Une fiche par note : titre, module, date, destinataire(s), sujet (Markdown rendu), détail par critère
  (points / max), note totale, appréciation, commentaires prédéfinis cochés. Note de groupe :
  une seule fiche adressée à tous les membres.
- E-mail : Resend, sujet « Vos résultats — <évaluation> », PDF en pièce jointe. Les étudiant·es
  sans e-mail sont signalé·es. Sans `RESEND_API_KEY`/`RESEND_FROM` : message
  « Envoi d'e-mails non configuré ».

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
- Ces données alimentent la trame (nom du/de la formateur·rice) et, en E7, les factures.

## Facturation (E7)

- `/modules/[id]/billing` : **Conditions YNOV** (trame envoyée, notes X/Y, 5 documents
  administratifs — case « Notes saisies dans Hyperplanning » ajoutée à la checklist du module) et
  **Mentions obligatoires** manquantes (avec liens vers Réglages / fiche module). Le bouton
  « Générer la facture » n'est actif que si tout est vert ; le serveur revérifie tout.
- Facture : numéro `AAAA-NNN`, échéance 30 jours fin de mois, désignation
  « Prestation d'enseignement – Module … (YCODE : …) – N heures », montants HT/TVA/TTC
  (franchise 293 B = TVA 0 % + mention), référence de bon de commande, IBAN.
- Formats : **PDF Factur-X (PDF/A-3 + XML EN 16931)** et XML seul, téléchargeables à tout moment
  (régénérés à l'identique depuis l'instantané).
- Cycle : À envoyer → (e-mail à l'école **ou** marquage manuel) Envoyée → Payée.
- `/billing` : par module — facturé (n° + statut) / prêt à facturer / bloqué (nb de points).
