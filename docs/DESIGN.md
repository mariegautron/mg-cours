# Système « Atelier » (13 novembre 2026, piste A de l'audit DA)

Couche de règles posée par-dessus « Studio de nuit · lavande » pour une interface plus pro.
Jetons dans `src/app/globals.css`, composants de base dans `src/components/ui/` et `pill.tsx`.

- **Texte** : 12 · 13 · 14 · 16 · 20 · 26 px, rien d'autre (`text-xs`, `text-[13px]`,
  `text-sm`, `text-base`/`text-lg`, `text-xl`/`text-2xl`, `text-3xl`/`text-4xl`). Corps 14 px en
  « Compacte » (défaut), 15 px en « Confortable » ; la racine reste à 16 px.
- **Hiérarchie** : le h1 (26 px, Bricolage 700) est toujours le plus grand texte de la page.
  Titres de carte et de section : Inter 600, 14 px. Bricolage 700 seulement pour le logo, le h1, le
  titre de la carte mise en avant et les grands chiffres (classe `title-display`).
- **Graisses** : Inter 400, 500, 600 ; Bricolage 700 (plus de 800).
- **Arrondis** : pastilles et étiquettes 6 px (`rounded-sm`), boutons et champs 8 px
  (`rounded-lg`), surfaces 12 px (`rounded-xl`). `rounded-full` : avatars et interrupteurs.
- **Espacements** : 4 · 8 · 12 · 16 · 24 · 32 px.
- **Couleurs** : contour `#2C2C36`, secondaire `#A3A3AE` (7:1), tertiaire `#8A8A96` (5,2:1,
  `text-muted-foreground-2`). La lavande ne sert qu'à l'action principale, à l'élément
  sélectionné (menu, onglet), au focus et aux liens dans un paragraphe.
- **Bouton** : 36 px de haut (zone cliquable 44 px), 14 px 500. `default` (lavande pleine, une par
  zone), `secondary` (fond `--secondary` + contour `--btn-border`), `ghost` (texte gris, actions de
  ligne), `destructive`, `link`. Pas de bouton dessiné à la main : `buttonVariants`.
- **Pastille / statut** (`Pill`, `Status`) : 22 px, 6 px d'arrondi, texte 12 px 500, icône
  12 px ; fond = couleur du statut à 13 %, texte = couleur du statut (teinte foncée en clair,
  jetons `--status-*-fg`). Tons neutres : fond `--muted`, texte gris.
- **Carte** : 12 px, contour 1 px `--border`, marge 16 × 20 px. Mise en avant : seulement la
  bordure `--featured-border`.
- **Icônes** : lucide, trait 1,75, 16 px (menu compris), 12 px dans les pastilles.
- **Menu latéral** : 232 px, éléments de 34 px (zone 44 px), texte 14 px gris ; actif = fond
  `--sidebar-accent`, texte blanc, icône lavande. Sous-menu du module en 13 px, actif avec un trait
  lavande de 2 px à gauche.
- **Margot** : hors de l'en-tête du tableau de bord ; dans le logo et les écrans vides.

---

# Design — Marelle, « Studio de nuit · lavande » (depuis le 12 novembre 2026)

Rebranding validé par Arnaud (8 novembre) : l'appli s'appelle **Marelle**, sa mascotte est
**Margot la pie** (`src/components/mascot.tsx`, composant unique, 4 humeurs). Planche de référence :
canvas « DA Marelle », variante « A · Studio lavande ». Sources : `docs/ux-ui-commun/`.

- **Sombre par défaut** (interface de Marie et espace étudiant·e), bouton du thème clair conservé.
  Les vues projetées ont leur propre réglage clair / sombre mémorisé (`projection-theme.tsx`).
  Les PDF restent sur fond blanc, avec « Généré avec Marelle » en pied de page.
- **Sobre, outil pro** : aucun halo, aucun dégradé, aucune grande tuile colorée. La couleur sert
  l'action (accent lavande `#B9A9FF`) et les statuts, rien d'autre. Icônes du menu monochromes.
- **Jetons** (une seule source, `src/app/globals.css`, bloc `.dark`) : fond `#0E0E11`, carte
  `#17171C`, carte surélevée / champ / actif `#1F1F26`, texte `#EDEDF0`, secondaire `#9A9AA6`,
  séparateur `#26262E`, contour de bouton secondaire `#34343F`, contour de champ `#6A6A78`,
  carte mise en avant `.card-featured` (contour `#3B3560`, reflet intérieur).
- **Statuts** (`--status-*`, texte `#0E0E11`, toujours icône + mot) : pas commencé `#B9B9C4`,
  à compléter `#E8C26A`, prêt `#7FDDB0`, publié `#9CCBFF`, bloquant `#FF7A85`.
- **Formes** : cartes 16 px, boutons et champs 10 px, contour 1 px, pas d'ombre portée. Boutons
  dessinés à 36 px avec une zone cliquable de 44 px.
- **Typo** : Bricolage Grotesque 800 (titres, chiffres, logo « marelle » en minuscules), Inter.
- **Densité** : « Compacte » par défaut (corps 15 px, titre de page 22 px), « Confortable » dans
  Réglages > Apparence. Budget : 3 écrans au plus à 1366 × 768, 4 à 125 %.
- **Focus** : anneau de 3 px à l'accent, décalé de 3 px, partout.

---

## Historique : direction « ludique & colorée » (septembre 2026, remplacée)


Direction validée par Marie : identité forte et joyeuse, **thème sombre par défaut** (clair au choix via le
bouton du bandeau), **barre latérale gauche**, **coque expressive / données calmes**.

## Principe : deux registres

- **Coque expressive** — connexion, barre latérale, tableau de bord, états vides : couleur, typo d'affichage,
  halos, mascotte, micro-animations.
- **Données calmes** — listes, formulaires, notes, trame, **facture** : mêmes tokens mais sobres, denses,
  lisibles. Les PDF (trame, résultats, facture) restent strictement neutres, sans mascotte ni couleur de marque.

## Palette (tokens dans `src/app/globals.css`)

Base « encre violette ». Accents : **violet** (marque), **corail**, **menthe**, **soleil**, **ciel**.
Chaque accent existe en deux versions (vive en sombre, profonde en clair) pour rester lisible comme texte/icône.
Tous les couples texte/fond utilisés ont un contraste **≥ 6,3:1** (AA exige 4,5:1), vérifiés par calcul
(script OKLCH → WCAG) puis par axe-core sur 12 écrans × 2 thèmes (`e2e/design.spec.ts`).

| Rôle          | Sombre            | Clair                 |
| ------------- | ----------------- | --------------------- |
| Fond / carte  | encre 0.16 / 0.21 | lavande 0.985 / blanc |
| Primaire      | lavande vive 0.74 | violet profond 0.48   |
| Texte atténué | 0.74 (8,4:1)      | 0.46 (6,9:1)          |
| Danger        | 0.72 corail-rouge | 0.50 rouge profond    |

Ajouter une couleur : la déclarer dans `:root` **et** `.dark`, l'exposer dans `@theme inline`, puis recalculer
les contrastes avant usage en texte.

## Éléments signature

- **Typo d'affichage** : Bricolage Grotesque (titres, chiffres clés) ; texte courant Inter.
- **Mascotte « Plume »** (`src/components/mascot.tsx`) : chouette diplômée, 4 humeurs (`happy`, `thinking`,
  `party`, `alert`). Décorative (`aria-hidden`) : le texte voisin porte toujours l'information.
  Utilisée : connexion, pied de barre latérale, bandeau du tableau de bord (`alert` si une trame est urgente,
  `party` sinon), tous les états vides (`Empty`).
- **Halos / dégradés** : classes `halo` (contour + lueur) et `bg-shell` (deux lueurs de fond) ; blobs flous
  décoratifs sur la connexion et le bandeau.
- **Icônes** : lucide dans des pastilles teintées par section (violet tableau de bord/réglages, corail modules et
  facturation, menthe ressources, ciel étudiants, soleil évaluations) + logo maison `LogoMark`.
- **Motion** : `animate-float` (mascotte), `animate-pop-in` (cartes), survol en léger soulèvement.
  Toutes neutralisées par la règle globale `prefers-reduced-motion` (`globals.css`).

## Ton

Décision de Marie (29/09) : l'interface **tutoie** partout, sans exception — « Crée ton premier module »,
« Pour toi seule », « Ta saisie est conservée ». C'est son outil personnel, avec une mascotte : le
vouvoiement est froid et le passage de l'un à l'autre déstabilise.

- **Concerné** : tout ce que l'interface dit à Marie — titres, aides, boutons, états vides, confirmations,
  toasts, messages d'erreur (Server Actions comprises) et les tests e2e qui les citent.
- **Non concerné** : ce que Marie dit à ses étudiant·es — diapositives projetées (« À la fin du module, vous
  saurez… », « Pour aujourd'hui, vous deviez… »), PDF et e-mails de restitution. C'est sa voix, pas celle de l'outil.
- **Erreurs** : une cause dite simplement (« On n'a pas pu enregistrer »), « Ta saisie est conservée » **seulement
  quand c'est vrai** (formulaire branché sur `keepFormValues`, qui empêche React 19 de vider les champs), et
  toujours une issue (lien). Jamais de nom de variable d'environnement ni de vocabulaire technique.
  Les messages partagés vivent dans `src/lib/messages.ts` ; `ActionError` ajoute le lien d'issue.
- **Accords** : `1 jour` / `12 jours`, `1 autre` / `2 autres` (jamais « jour(s) »), écriture inclusive avec
  le point médian (« étudiant·e·s »), accents obligatoires.
- **Jalons** : on célèbre les vrais jalons, sobrement (une phrase, mascotte « party » pour ces seuls moments) :
  progression envoyée, toutes les copies corrigées, facture payée (« Module terminé. »). La mascotte
  « alert » est réservée à l'urgence (J-7 et retard), « thinking » à J-15.

## États de route et attente

- **Chargement** : chaque segment lourd (tableau de bord, fiche module, évaluation, facturation, présentation)
  a son `loading.tsx` ; `PageSkeleton` (titre + 3 blocs) réserve la place, il est `aria-hidden`.
- **Indicateur de navigation** : `NavigationStatusProvider` (coque `(app)`) affiche un filet de progression en
  haut de l'écran (après 150 ms, pour ne pas clignoter) et porte **la seule** zone d'annonce de navigation
  (`aria-live="polite"`, équivalent de `role="status"` sans en porter le rôle, pour ne pas rendre ambiguës les
  zones `role="status"` des pages), qui annonce « Chargement… ». Les liens (`LinkPending`, via `useLinkStatus`) et les squelettes
  (`RouteLoadingMarker`) déclarent leur attente ; aucun autre composant n'annonce un chargement de route.
- **Erreur / introuvable** : `error.tsx` et `not-found.tsx` (racine et `(app)`) disent en une phrase que les
  données ne sont pas perdues et proposent une issue (« Réessayer », « Retour au tableau de bord »). Le message
  technique n'est jamais affiché. Next 16 : l'erreur reçoit `retry()` (et `reset()`).
- **Motion** : le filet avance en CSS (`animate-nav-progress`) ; sous `prefers-reduced-motion` la règle globale
  le fige à sa fin, il reste simplement affiché.

## Boutons d'action et attente

- **`PendingButton`** (`src/components/ui/pending-button.tsx`) remplace `disabled={pending}` : spinner + libellé
  au participe présent (« Archivage… », « Suppression… », « Ajout… »), `aria-busy` (le bouton reste focalisable
  et garde son contraste), largeur conservée (les deux libellés occupent la même cellule), second appui
  identique ignoré. Les boutons d'icône seule n'affichent que la rotation (libellé pour lecteurs d'écran).
- **Fichiers générés à la volée** (PDF, zip, XML) : `DownloadButton` récupère le fichier puis annonce
  « PDF téléchargé. » (ou nomme l'objet : « Facture 2026-014 téléchargée. ») ; en cas d'échec, message inline
  avec « Réessaie » et un lien pour ouvrir le fichier directement. Les fichiers déjà stockés restent de
  simples liens.
- **Aperçus en nouvel onglet** des documents générés : `PreviewLink` ouvre l'onglet tout de suite sur
  « Préparation de l'aperçu… » (jamais d'onglet blanc) ; Ctrl/⌘ + clic reste un lien ordinaire.

## Ergonomie tactile, navigation et états « à faire »

- **Cibles tactiles** : `Button` garde ses tailles compactes (données calmes) mais offre `touch` (44 px),
  `touch-lg` (56 px, précédent / suivant en présentation) et `icon-touch` (44 px). Elles ne s'appliquent qu'au
  carnet de séance et à la présentation, utilisés debout, au doigt ou à distance ; le reste de l'app n'est pas
  touché.
- **Lien d'évitement** : « Aller au contenu » est le premier arrêt clavier de la coque `(app)`, visible au focus,
  et déplace le focus sur `#contenu`.
- **Une action primaire par vue** : sur la liste des séances, « Faire cours » est primaire sur la séance du jour
  (ou la prochaine) seulement ; Modifier, Monter, Descendre et Supprimer vivent dans le menu « ⋯ » de la séance
  (Supprimer garde sa confirmation qui nomme la séance).
- **Tokens sémantiques** : `--warning` (ambre, « à faire ») et `--success` (menthe, « fait ») s'ajoutent au rouge
  d'erreur `--destructive`. Ce sont des alias de `--sun` et `--mint`, dont les contrastes sont déjà vérifiés
  (≥ 6:1) dans les deux thèmes. Une chose à faire n'est pas une erreur : pas de rouge.
- **Facturation d'un module** : résumé (« Prêt à facturer ✓ » ou « N points à traiter ») et action principale en
  tête de page ; chaque condition non remplie porte son lien (« Saisir une note → »).
- **Tableau de bord** : la carte « Aujourd'hui » vient en premier ; sans cours, elle dit quand est la suite au lieu
  de se taire. Rien d'autre n'a été changé (la refonte du tableau de bord sera cadrée avec Marie).
- **Fiche module** : elle s'ouvre sur l'onglet qui demande une action (`defaultModuleTab`), l'ancre de l'URL
  (`#billing`…) restant prioritaire.

## Accessibilité du design

- Couleur jamais seule : les statuts sont toujours doublés d'un libellé (« J-4 », « Trame envoyée »…).
- Focus visible conservé (anneau `--ring` violet, contrasté).
- Bascule clair/sombre : bouton icône avec nom accessible ; icônes pilotées en CSS (pas de flash).
- Reste à faire par Marie : passe manuelle (zoom 200/400 %, lecteur d'écran) — cf. `ACCESSIBILITY.md`.

## Ton

Décision de Marie (29/09) :

- **L'interface qui parle à Marie tutoie** : boutons, aides, messages d'erreur et de confirmation
  (« Dépose le PDF », « Vérifie l'aperçu »). Pas de vouvoiement.
- **Tout texte destiné aux étudiant·es vouvoie** : présentation du module, sujets, fiches de résultats,
  e-mails, PDF, diapos projetées (« Ce module vous apprend à… »).
- **Tout contenu généré est en écriture inclusive au point médian** : étudiant·es, formateur·rice, prêt·e,
  celles et ceux… Pas de doublets lourds (« les étudiants et les étudiantes »), pas de « e » entre parenthèses.
- **Factures et mentions légales** gardent leurs libellés légaux, sans reformulation.
