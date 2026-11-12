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
