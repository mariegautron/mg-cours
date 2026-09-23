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

## Accessibilité du design

- Couleur jamais seule : les statuts sont toujours doublés d'un libellé (« J-4 », « Trame envoyée »…).
- Focus visible conservé (anneau `--ring` violet, contrasté).
- Bascule clair/sombre : bouton icône avec nom accessible ; icônes pilotées en CSS (pas de flash).
- Reste à faire par Marie : passe manuelle (zoom 200/400 %, lecteur d'écran) — cf. `ACCESSIBILITY.md`.
