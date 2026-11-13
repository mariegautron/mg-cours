# Décisions de la nuit du 12 au 13 novembre 2026 (rebranding Marelle + corrections UX/UI)

Arnaud dort ; je tranche seul et je note ici chaque choix, pour qu'il puisse le relire et le
défaire. Sources : `docs/ux-ui-commun/prompt-corrections.md`, `docs/ux-ui-commun/rapport.md`,
prompt de rebranding (Library), planche « DA Marelle ». Aucun test lancé, aucune donnée touchée,
aucune migration. Vérification : `tsc --noEmit` + ESLint/Prettier sur les fichiers modifiés.

## Rebranding « Marelle » (lot R)

- **Margot dessinée tout de suite.** Le prompt §3 disait « garder la chouette tant que le dessin
  n'existe pas », mais le §4 et la planche valident déjà Margot (SVG du canvas). J'ai donc repris ce
  dessin dans `Mascot` (contour = texte, aile = accent, case de marelle = couleur de statut) avec les
  4 humeurs. Les anciennes humeurs restent acceptées (`happy`→contente, `thinking`→pensive,
  `party`→contente, `alert`→alerte) ; nouvelle `sleepy`→endormie, utilisée par défaut dans les états
  vides. Décorative par défaut ; `informative` lui donne `role="img"` et « Margot, la pie de Marelle… ».
- **Plus d'animation de flottement par défaut** (`float=false`) : esprit sobre demandé.
- **Logo** : tête de Margot + « marelle » en minuscules (§4 de la DA, plus récent que le « Marelle »
  en casse normale du §2). Le texte reste lu « Marelle » ; le lien a un libellé explicite.
- **Grande chouette du bas du menu retirée** ; icônes du menu monochromes, l'actif prend l'accent.
- **Jetons** : remplacés dans le bloc `.dark` existant (pas de second thème). Les anciens accents
  (`violet`, `coral`, `mint`, `sun`, `sky`) pointent désormais vers l'accent et les couleurs de
  statut : tout le code qui les utilise suit sans réécriture. Nouveaux jetons `--status-*`,
  `--field`, `--btn-border`, `--featured-border`, `--private`, `--margot-*`.
- **Thème clair** : gardé tel quel (violet), avec les mêmes pastilles de statut.
- **Halos et dégradés** : classes `.halo` et `.bg-shell` neutralisées, taches floues de la page de
  connexion supprimées. Ombres `shadow-xs/sm` mises à zéro (les menus flottants gardent les leurs).
- **Rayons** : `--radius` à 10 px (boutons, champs) ; `rounded-2xl` et `rounded-3xl` ramenés à
  16 px (cartes) par les jetons, sans toucher aux 160 usages.
- **Boutons** : 36 px dessinés, zone cliquable de 44 px par un pseudo-élément ; contour du bouton
  secondaire `#34343F` ; champs sur fond `#1F1F26` avec contour `#6A6A78` (3:1).
- **Focus** : règle globale `:focus-visible` (3 px accent, décalage 3 px).
- **Densité** : nouveau réglage « Compacte » (défaut) / « Confortable » dans Réglages > Apparence,
  cookie `density`, à côté de la taille du texte. Compacte = racine à 15 px, titre de page à 22 px.
- **Projection** : réglage clair / sombre propre aux vues projetées, mémorisé dans ce navigateur
  (`localStorage`), indépendant du thème de l'appli ; sans choix, la projection suit l'appli.
- **E-mails** : nom d'expéditeur « Marie via Marelle », adresse technique inchangée. **Sauf la
  facture** envoyée à l'école (identité de Marie, groupe B) : expéditeur inchangé.
- **PDF** : « Généré avec Marelle » en pied de page de la grille et des résultats ; noms de fichier
  tirés du titre (`grille-jalon-2-sprint-review.pdf`, `resultats-….pdf`). La progression et la
  facture (documents envoyés à l'école) ne portent pas la mention.
- **Aperçus de liens** : le lien de classe et l'espace étudiant·e ont pour titre le nom du module
  puis « Marelle » ; image d'aperçu commune sans aucune donnée privée (`opengraph-image.tsx`).
- **Exports** : fichiers `marelle-mes-donnees-….zip`, en-tête CSV « Marelle · export… ».
- **Restent « MG COURS » / « mg-cours » (groupes B et C, volontairement)** : nom du paquet, du
  projet Supabase et Vercel, domaine `mg-cours.vercel.app`, sel technique des QCM, migrations,
  seed, scripts de migration Notion, titres de sources Notion citées dans la doc, historique du
  BACKLOG.

## Lot 0 : écrire, trouver ses copies, noter juste

- **A. Note du groupe** : « Un mot pour [prénom] » et « Un mot pour tout l'axe » deviennent des
  zones de texte de 3 lignes qui s'agrandissent, pleine largeur. Le **Bilan** (points forts,
  progrès, commentaire libre) passe sous la grille en pleine largeur ; la colonne de droite garde
  total, présence et observations. Les onglets de critères passent à la ligne. « Pas encore noté »
  n'est plus une tuile : c'est un texte sous les paliers, avec un bouton discret « Effacer le
  palier » pour revenir à cet état (sinon on ne pouvait plus « dé-noter »).
- **Zones de commentaire** : 4 lignes par défaut partout (`CommentField`, `Textarea` min. 4 lignes).
- **B. Comparer un critère** : paliers à gauche, commentaire à droite sur 60 % de la largeur.
- **C. Oral en lettres** : un oral avec grille passe désormais par la correction en lettres A à D
  (celle des rendus), sans le bloc « Rendu » à gauche. Les notes déjà saisies en points sont
  relues en lettres quand elles tombent pile sur un palier (logique existante `lettersFromScores`).
- **D. Blocs selon le type** : la table `kindBlocks` existait déjà ; je n'ai rien ajouté.
- **E/35/36. Page d'une évaluation** : sommaire en haut (Copies, Sujet, Grille, Attendus). Dès que
  la date est passée ou qu'une note existe, le tableau des copies remonte sous l'en-tête et toute la
  préparation (épreuve, grille, cadre, sujet, attendus, rendus) se replie dans « Préparation ».
  « Attendus évalués » replié (« 3 attendus évalués · Modifier »), seulement les cochés, et chaque
  case s'enregistre seule. **Pas fait** : passer en enregistrement automatique les autres blocs
  (« Quelle épreuve ? », « Où rendre », réglages du dépôt, note bonus, horaires de l'oral) ; ils
  gardent leur bouton. Retour « ← Les évaluations » remonté au-dessus du titre.
- **F. Une seule façon d'enregistrer** : « Enregistrer tout » et « Enregistrer la note » retirés ;
  l'état (« Enregistré à 15 h 12 », « Pas enregistré · Réessayer ») s'affiche dans la barre du bas.
- **G. Une seule navigation** : « ← · Groupe 1 · Groupe 2 · … · → » en haut de la correction (avec
  l'état de chaque copie), « Vue d'ensemble » dans la copie. « Aller à une copie » et les boutons
  « Copie précédente / suivante » retirés.
- **H. Aides clavier masquées** : correction, trombinoscope, point d'étape, observations,
  projection (« touche F » → bouton « Plein écran »). Les raccourcis marchent toujours.
- **A3 (barre du bas qui recouvre)** : pas touché ; la barre est collée dans le formulaire et
  `scroll-padding-bottom` évite déjà de cacher le focus. À revérifier à l'écran.
- **I. Page d'une séance** : sous ~1 400 px utiles (fenêtre < 1 680 px), « Les N séances » devient
  une liste repliée en haut ; au-delà, elle reste en colonne. Attendus, évaluation liée et quiz
  passent toujours sous la séance (2 colonnes). Actions : « Faire cours » en principal,
  « Modifier » (+ « Modifier la clôture » si la séance est faite), le reste (ordre, suppression)
  dans « Plus ». Les 3 boutons d'ajout de séance deviennent « Ajouter une séance ▾ ». Le déroulé
  se replie au-delà de 5 étapes (« Voir les 8 autres étapes »).

## Relecture par un directeur artistique (sous-agent, demande d'Arnaud) et lot 1 (début)

Arnaud a demandé deux relecteurs experts. Un directeur artistique a relu le rebranding ; un expert
UX/UI a relu le lot 0. Les deux en lecture seule, sans build ni test. Retenu de la relecture DA :

- Variante `dark:` corrigée pour la projection claire (`.theme-light`), sinon les classes `dark:`
  restaient actives sur fond blanc.
- Pastilles : `published` (bleu glacier, œil) et `lock` (bloquant, octogone) sont les vrais
  statuts ; `wip` devient neutre (« Lecture en cours », compte à rebours). « Privé », « Toi
  seule », étape facultative : neutres. Préparation de séance : pas commencé = gris, en cours = à
  compléter. Composant `Status` (5 états) ajouté dans `pill.tsx` ; chaque statut a son icône.
- Contour lavande de la carte mise en avant réellement visible (anneau), contours de champ et de
  bouton du thème clair remontés à 3:1.
- Couleurs Tailwind vives restantes (emerald, amber, yellow, sky…) remplacées par les jetons
  (`text-success`, `text-warning`, `border-status-*`, `bg-muted`) : une trentaine de fichiers.
  Teintes colorées des blocs (`bg-mint/15`, `bg-sun/15`…) ramenées à `bg-muted` + contour de statut.
- Tuiles de « Cette semaine » neutres. Titres h1/h2 en 800. Voiles des fenêtres à 60 %. Champs
  désactivés en gris neutre. Boutons `sm`/`xs` à 10 px avec zone cliquable de 44 px.
- Favicon : tête de Margot (`src/app/icon.svg`) à la place du logo Next.js.
- Connexion : Margot n'apparaît plus deux fois (seulement le logo).
- **Pas fait** : charger Bricolage Grotesque dans l'image d'aperçu des liens (il faudrait embarquer
  le fichier de police) ; restent des couleurs de texte `text-mint`/`text-sun` (81 usages) qui
  pointent déjà vers les jetons de statut.

Lot 1, ce qui est fait à ce stade :
- **Confirmations dans l'appli** (`useConfirm`, `ConfirmSubmitButton`) : plus aucune boîte
  `window.confirm` pour les actions qui ne se défont pas (nouveau lien de QCM, envoi des liens par
  e-mail, publier le QCM, régénérer une progression déjà envoyée, changer de façon de corriger,
  remplacer par un gabarit, abandonner un brouillon d'oral, effacer une note écrite, remplacer un
  texte proposé). Restent natives : l'alerte « quitter avec des modifications » (le navigateur
  l'impose au rechargement) et deux « abandonner les modifications » de formulaires.
- **Dupliquer le module** : on choisit le nom de la copie (par défaut « Nom (2027) ») et l'année,
  puis une confirmation dans l'appli nomme la copie et ce qui part avec ; avertit si le nom est
  identique à l'original.

## Relecture UX/UI du lot 0 (sous-agent) : corrigé

- **Régression évitée** : sans grille, une copie sans note n'enregistrait jamais rien et bloquait
  la sortie (plus de bouton « Enregistrer »). La barre dit maintenant « Note manquante : rien n'est
  enregistré » et la garde avant de quitter ne se déclenche plus pour cette copie.
- **Navigation unique aussi dans la correction en lettres** (rendus et oral) : « ← · copies avec
  leur état · → » et « Vue d'ensemble » ; plus de « Copie suivante » en double dans l'espace oral.
  Les flèches repassent en vue copie depuis « Par critère » ; liens de copie à 44 px.
- Sommaire de l'évaluation : liens vers chaque bloc (Chrome ouvre la section repliée), cibles
  44 px. Les copies remontent aussi quand l'évaluation n'est datée que par sa séance.
- Le jour de l'oral, « Horaires de l'oral » reste visible au-dessus de la Préparation repliée.
- Aides clavier encore visibles retirées (espace oral « Touches A à D », chiffres des types
  d'observation).
- « Effacer le palier » annonce « Palier effacé… » aux lecteurs d'écran.
- Déroulé replié : il se déplie quand on déplace une étape au-delà de la 5e ou qu'on ajoute une
  ressource.
- Attendus évalués : en cas d'échec, les cases reviennent à l'état enregistré ; alerte avant de
  quitter pendant l'enregistrement ; « Modifier » a un nom accessible distinct.
- Menus « Plus » et « Ajouter une séance » : vrai bouton (`DisclosureMenu`) refermé par Échap,
  clic à côté ou choix d'un lien ; contenu gardé monté pour ne pas fermer la confirmation de
  suppression.
- Liste des séances repliée : titre h2 (lecteurs d'écran).
- **Pas fait** : commentaire modifiable dans « Par critère » de la correction en lettres (B pour
  l'oral, demande d'écrire par `saveOralField` avec version) ; afficher l'ancienne note en points
  quand elle ne tombe sur aucun palier (à vérifier sur l'oral SCRUM) ; « Ressources retenues »
  repliées (écran Modifier la séance, lot 4).

## Lot 1 (suite)

- **Statut** : composant `Status` (5 états, icône + mot) dans `pill.tsx` ; toutes les `Pill` de
  statut ont désormais leur icône. Sur la page d'une évaluation, coefficient, barème et type de
  note passent en texte gris séparé par « · », la grille devient un lien texte.
- **Messages de confirmation** : en bas à droite, 4 s (réglage du `Toaster`). Je n'ai pas converti
  tous les messages « Enregistré » en ligne vers ce format.
- **Alerte à 3 niveaux** : composant `Notice` (info, attention, bloquant). Appliqué à l'écart
  d'heures des séances (attention) et à la règle de tirage impossible du QCM (bloquant, le bouton
  Publier reste grisé avec la raison).
- **Barre d'actions collée en bas** : formulaire de l'évaluation et du module. (Grille, séance,
  ressource, projet, correction l'avaient déjà.)
- **Alerte avant de quitter** : la confirmation de navigation passe dans l'appli (« Quitter sans
  enregistrer ? » / « Rester sur la page ») ; au rechargement ou à la fermeture de l'onglet, c'est
  forcément la boîte du navigateur.
- **Zone privée** : composant `PrivateZone` (fond `--private`, pastille « Pour toi seule »),
  appliqué au retour d'expérience avant de dupliquer un module.
- **Pas fait dans ce lot** : menu « Plus » au-delà de 3 actions secondaires partout (fait sur la
  séance), retour unique « ← page parente » partout (fait sur l'évaluation, repris au lot 4/6).

## Lot 2 : signaux justes

- **9 et 10** (cadre « Complet » avec « ! À rendre », « Où rendre » alors que le dépôt dans l'appli
  est réglé, couverture des attendus différente entre écrans et PDF) : déjà corrigés par des
  sessions précédentes ; j'ai vérifié que le cadre combine bien ses contrôles, que « Où rendre »
  est satisfait par le dépôt dans l'appli et que « Avant de générer » et le PDF lisent la même
  source (`getExpectationCoverageView`). Rien changé.
- **11. Prochaine étape** : l'étape « Fiche de l'école et attendus » est faite dès qu'il y a des
  attendus, même sans PDF de fiche déposé (test mis à jour, non lancé). Le bouton « Prochaine
  étape » ne s'affiche plus en haut des sous-pages du module : seulement sur « Où j'en suis » et
  Aujourd'hui.
- **12. Prêt pour le jour J ?** : statut avec le composant `Status` (« Prête » ou « 3 à
  compléter »), manques en premier. Un seul « Prête · Remettre À construire » sur la page (celui de
  l'encadré « Avant le jour J »).
- **Tablette (lot 4, point 21, fait au passage)** : le menu du module ne défile plus à
  l'horizontale ; 4 entrées visibles, les autres dans « Plus ».

## Lot 3 : documents envoyés figés (partiel)

- **Progression** : la version envoyée était déjà gardée (PDF figé dans le stockage, nom daté à la
  minute) ; « Régénérer » après envoi demande maintenant une confirmation dans l'appli qui le
  rappelle. Nouveau bloc « Aperçu du PDF » : « Voir la progression » et « Voir la version envoyée
  le … », qui s'ouvrent dans un onglet (paramètre `inline=1` ajouté à la route), avec « Généré le
  … à … ». Page en 1 colonne sous ~1 200 px utiles.
- **À décider par Arnaud** : un aperçu *dans* la page (iframe) est bloqué par l'en-tête
  `X-Frame-Options: DENY` de `next.config.ts`. Le passer à `SAMEORIGIN` autoriserait les cadres de
  l'appli elle-même (et réparerait l'aperçu des rendus dans la correction, qui utilise déjà une
  iframe et doit être vide aujourd'hui). Je ne l'ai pas changé : c'est un réglage de sécurité.
- **Pas fait** : versions datées des résultats publiés et des appréciations reportées (il faudrait
  une table d'historique, donc une migration, interdite cette nuit).

## Lot 4 : longueur des pages et 125 % (partiel)

- **15. Menu latéral** : grande mascotte retirée (rebranding), menu sans pied fixe donc il défile
  entièrement ; nom du module ouvert sur 2 lignes et en entier au survol.
- **16. En-têtes compacts** : le nom du module est retiré des titres de 8 pages (Évaluations,
  Appréciations, Facture, Rattrapages, Nouvelle séance, Nouvelle / Ajouter une évaluation, Aperçu
  de l'espace) ; il reste dans le fil d'Ariane (ajouté pour « Aperçu de l'espace »). Titres à
  22 px en densité compacte. **Pas fait** : phrase d'aide repliable sur toutes les pages.
- **17** : fait au lot 0. **18. Modifier la séance** : objectifs, animation, évaluation, matériel
  en haut ; la bibliothèque de ressources repliée en bas (« Ressources de la séance · 4 retenues »).
- **20** : page Séance (lot 0) et Progression (lot 3) en moins de colonnes sous ~1 200 px utiles.
- **21. Tablette** : fait au lot 2 (menu du module avec « Plus »).
- **Pas fait** : 19 (grilles repliées, éditeur en tableau critères × paliers) : refonte de l'éditeur
  trop risquée sans pouvoir la tester à l'écran.

## Lot 5 : vocabulaire et finitions (partiel)

- **22. Lexique** : « onglet Administratif » → « onglet Documents » ; « Phrases » →
  « Phrases de commentaire » (page, menu de la bibliothèque, lien de la correction). « Nouvelle
  phrase » était déjà le seul libellé (pas de « Nouveau commentaire »).
- **23. Typographie** : heures « 15 h 12 » partout où l'appli affiche « Enregistré à… » (fonction
  `frTime`, heure de Paris). **Pas fait** : passe globale des espaces insécables avant « : ; ? ! »
  et des accords (trop de textes, risque de casser des chaînes testées).
- **24. Titres de séance par défaut** : « Séance 1 » au lieu de « Séance 1 · Séance 1 »
  (tableau de bord, clôture, séances vides) via `sessionHeading`.
- **25. Liste des modules** : la vue par défaut montre aussi les modules « À préparer » : un module
  tout juste créé est visible tout de suite.
- **27. Espace étudiant·e au téléphone** : en-tête d'une ligne (« Mon espace · Module »), onglets
  fixés en bas de l'écran.
- **Pas fait** : 26 (compteur près de la limite dans chaque zone de texte : il faudrait rendre le
  composant `Textarea` contrôlé partout) ; paliers des grilles en texte simple côté étudiant·e.

## Lot 6 : constats du 9 novembre

- **28. Masquer d'Aujourd'hui** : bouton dans « Plus » de la page du module (« Masquer
  d'Aujourd'hui » / « Afficher dans Aujourd'hui », message avec « Annuler »). Un module masqué ne
  compte plus sur le tableau de bord : séances faites, prochaine séance, À corriger, À faire,
  évaluations à venir, reprise. **Rangé provisoirement dans `module.admin_docs`
  (`hidden_from_today`)** car aucune migration n'est permise cette nuit ; à déplacer dans une vraie
  colonne au prochain lot de schéma. Je n'ai masqué aucun module : à toi ou Marie de cocher.
- **29. Une seule source pour « Prochaine étape »** : la pastille n'apparaît plus en haut des
  sous-pages du module (lot 2). **Pas fait** : aligner l'alerte « progression en retard » du
  tableau de bord sur le calcul du parcours du module (deux calculs différents aujourd'hui).
- **30. Jalons** : la page Jalons n'existe plus (redirigée vers Évaluations) : rien à faire.
- **31. En-tête unique des pages du module** : les « ← Retour au module » en double sont retirés
  (Espace étudiant·es, Facture, Terminer, Progression, Évaluations) ; le fil d'Ariane suffit.
  Le titre « Facturation » devient « Facture » (comme le menu).
- **32. Filtres** : chaque module une fois, l'année scolaire entre parenthèses seulement quand deux
  modules ont le même nom (filtre des évaluations et des étudiant·es).
- **33. Évaluations du module** : « Évaluations (4) · dont 1 hors notes exigées » ; « Ajouter une
  évaluation » passe en secondaire quand tout est prévu ; texte d'aide replié ; titre unique.
- **34. Chargement** : Modules et Bibliothèque affichent leur titre et des cartes vides tout de
  suite. **Pas fait** : accélérer les requêtes elles-mêmes.
- **35 et 36** : faits au lot 0.

## Relecture finale (sous-agent expert UX/UI + DA) : corrigé

- **Bloquant corrigé** : les modules masqués d'Aujourd'hui sont retirés *avant* de couper les
  listes (« À corriger » limité à 3, prochaines séances, reprise) ; sinon un module de test plein
  de copies vidait la carte. La reprise connaît désormais le module de chaque séance. Masquage
  calculé sur tous les modules (archivés compris) ; rattrapages de la semaine filtrés aussi.
- **Bloquant corrigé** : liste des modules : nouvel onglet « En cours et à préparer » (vue par
  défaut de `/modules`) ; « En cours », « À préparer » et « Terminés » gardent leur sens et leur
  compteur exact (adresse `?filter=…`).
- **Dupliquer le module** : la copie ne reprend plus les dates ni les horaires des séances (l'écran
  l'annonçait déjà : « ni dates »). Le nom proposé suit l'année tant qu'il n'a pas été retouché ;
  l'avertissement « même nom » marche aussi champ vide.
- Calcul de « Prochaine étape » retiré des sous-pages du module (plus affiché : requêtes inutiles).
- « Quitter sans enregistrer » vers un PDF (`/api/…`) : vraie navigation du navigateur.
- « Ajouter une évaluation » reste principal quand le module n'a aucune note exigée.
- Heures « 9 h 05 » avec espaces insécables. Bouton « Plus » à la taille des autres boutons.
  Messages en bas à droite au-dessus des barres collées. `Notice` sans rôle annoncé par défaut
  (seulement après une action). Onglet « Notes » court sur téléphone.
- **Pas fait** : garder les onglets en haut dans l'aperçu de l'espace côté Marie (tablette).

## Suites du 13 novembre (décisions d'Arnaud)

- `X-Frame-Options` passé de `DENY` à `SAMEORIGIN` (accord d'Arnaud) : les aperçus PDF de l'appli
  peuvent s'afficher dans ses propres pages ; les autres sites ne peuvent toujours pas l'encadrer.
- « Masquer d'Aujourd'hui » : vraie colonne `module.hidden_from_today` (migration
  `20261215000000_module_hidden_from_today.sql`, qui recopie puis retire la clé provisoire de
  `admin_docs`). Le code lit la colonne, et l'ancienne clé en secours ; contrôle en lecture seule
  dans `docs/schema-bdd/controle-hidden-from-today.sql`. Ordre : migration, puis push du code.

## 13 novembre : rattrapages et statut des copies (retour d'Arnaud sur la prod)

- **Statut clair par personne** :
  - page Rattrapages : « Pas encore passé » (rien de rendu), « Rendu, à corriger » (copie de QCM
    rendue ou dépôt reçu), « Noté · note remplacée : 14/20 » ; lien « Corriger » / « Saisir la
    note » sur la ligne ;
  - tableau des copies de toute évaluation : « Pas encore rendu », « Rendu, à corriger »,
    « En cours · 2 sur 4 », « Noté » (« À corriger » quand les rendus ne sont pas suivis : oral,
    écrit en classe). Pastilles d'initiales neutres (plus de couleurs vives).
- **Page d'un rattrapage** : les copies sont tout en haut dès l'ouverture, la préparation est
  repliée ; le type affiché est celui de l'évaluation rattrapée (une étude de cas n'est plus
  affichée « QCM ») ; plus de case « Préparer d'avance un sujet de rattrapage » ni de « Note
  bonus ». Dans le cadre, les lignes longues (« Comment c'est noté »…) sont résumées sur 2 lignes
  sans syntaxe Markdown : le texte complet reste dans « Sujet ».
