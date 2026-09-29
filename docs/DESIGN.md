# Design — « ludique & colorée », dark-first

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
